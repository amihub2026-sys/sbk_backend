export const normalizeText=(v="")=>String(v).trim().replace(/\s+/g," ");
export const normalizeName=(v="")=>normalizeText(v).toLowerCase();
export const digitsOnly=(v="")=>String(v).replace(/\D/g,"");
export function publicId(doc){const o=doc?.toObject?doc.toObject():{...doc};if(o._id){o.id=String(o._id);delete o._id;}delete o.__v;return o;}
export const escapeRegex=(v="")=>String(v).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
