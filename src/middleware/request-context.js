export function requestContext(req,res,next){res.setHeader("X-Request-ID",req.id||"");next();}
