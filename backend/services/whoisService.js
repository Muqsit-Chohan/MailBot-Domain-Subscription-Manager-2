const tls = require('tls');

/**
 * Clean domain string (remove protocol, www, paths)
 */
function cleanDomain(input) {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .split('?')[0]
    .split(':')[0];
}

/**
 * Inspect SSL Certificate via TLS
 */
function getSslCertificate(domain, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const clean = cleanDomain(domain);
    if (!clean) return resolve(null);

    let resolved = false;
    const socket = tls.connect(
      {
        host: clean,
        port: 443,
        servername: clean,
        rejectUnauthorized: false, // allow inspection even if self-signed or expired
        timeout: timeoutMs,
      },
      () => {
        if (resolved) return;
        resolved = true;
        try {
          const cert = socket.getPeerCertificate();
          socket.destroy();

          if (!cert || Object.keys(cert).length === 0) {
            return resolve(null);
          }

          const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
          const validFrom = cert.valid_from ? new Date(cert.valid_from) : null;
          const now = new Date();
          const daysRemaining = validTo ? Math.ceil((validTo - now) / (1000 * 60 * 60 * 24)) : null;

          const issuer = cert.issuer
            ? cert.issuer.O || cert.issuer.CN || cert.issuer.organizationName || 'Unknown Issuer'
            : 'Unknown';

          resolve({
            valid: validTo ? validTo > now : false,
            validTo,
            validFrom,
            daysRemaining,
            issuer,
            subject: cert.subject?.CN || clean,
          });
        } catch (err) {
          resolve(null);
        }
      }
    );

    socket.on('timeout', () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(null);
      }
    });

    socket.on('error', () => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    });
  });
}

/**
 * Fetch domain registration & expiry details via RDAP
 */
async function getRdapInfo(domain) {
  const clean = cleanDomain(domain);
  if (!clean) return null;

  const parts = clean.split('.');
  if (parts.length < 2) return null;
  const tld = parts[parts.length - 1];

  const urls = [];
  if (tld === 'com' || tld === 'net') {
    urls.push(`https://rdap.verisign.com/${tld}/v1/domain/${clean}`);
  } else if (tld === 'org') {
    urls.push(`https://rdap.publicinterestregistry.org/rdap/domain/${clean}`);
  }
  urls.push(`https://client.rdap.org/api/rdap/${clean}`);
  urls.push(`https://rdap.org/domain/${clean}`);

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        headers: {
          Accept: 'application/rdap+json, application/json',
          'User-Agent': 'MailBot/2.0 (Domain Manager)',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue;
      const text = await res.text();
      if (!text.startsWith('{')) continue;

      const data = JSON.parse(text);

      let expiryDate = null;
      let registrationDate = null;
      let registrar = null;

      if (Array.isArray(data.events)) {
        const exp = data.events.find(
          (e) => e.eventAction === 'expiration' || e.eventAction === 'registration expiration'
        );
        if (exp && exp.eventDate) expiryDate = new Date(exp.eventDate);

        const reg = data.events.find(
          (e) => e.eventAction === 'registration' || e.eventAction === 'created'
        );
        if (reg && reg.eventDate) registrationDate = new Date(reg.eventDate);
      }

      if (Array.isArray(data.entities)) {
        const regEntity = data.entities.find(
          (e) => Array.isArray(e.roles) && e.roles.includes('registrar')
        );
        if (regEntity) {
          if (Array.isArray(regEntity.vcardArray) && Array.isArray(regEntity.vcardArray[1])) {
            const fnItem = regEntity.vcardArray[1].find((v) => v[0] === 'fn');
            if (fnItem && fnItem[3]) registrar = fnItem[3];
          }
          if (!registrar && regEntity.handle) registrar = regEntity.handle;
        }
      }

      if (expiryDate || registrar) {
        return {
          registrar: registrar || 'Unknown',
          expiryDate,
          registrationDate,
        };
      }
    } catch (e) {
      // Continue to next endpoint
    }
  }

  return null;
}

/**
 * Main Lookup function: fetches both WHOIS/RDAP and SSL details
 */
async function lookupDomain(domainInput) {
  const domain = cleanDomain(domainInput);
  if (!domain) {
    throw new Error('Valid domain name is required');
  }

  const [rdapInfo, sslInfo] = await Promise.all([
    getRdapInfo(domain),
    getSslCertificate(domain),
  ]);

  return {
    domain,
    registrar: rdapInfo?.registrar || '',
    expiryDate: rdapInfo?.expiryDate || null,
    registrationDate: rdapInfo?.registrationDate || null,
    ssl: sslInfo || null,
  };
}

module.exports = {
  cleanDomain,
  lookupDomain,
  getSslCertificate,
  getRdapInfo,
};
