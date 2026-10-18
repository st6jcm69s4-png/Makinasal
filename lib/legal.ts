// Deployment-owned identity, never infer a company from a personal profile.
export function legalIdentity(){return {name:process.env.LEGAL_OPERATOR_NAME||'',address:process.env.LEGAL_OPERATOR_ADDRESS||'',email:process.env.LEGAL_CONTACT_EMAIL||''};}
export function legalReady(){const v=legalIdentity();return process.env.LEGAL_TEXT_APPROVED==='true'&&!!v.name&&!!v.address&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email);}
