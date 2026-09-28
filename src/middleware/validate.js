export function validate(schema,location="body"){return(req,res,next)=>{try{req[location]=schema.parse(req[location]);next();}catch(err){next(err);}};}
