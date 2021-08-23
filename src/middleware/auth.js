const jwt = require('jsonwebtoken')
const {Admin,AdminToken} = require('../models/adminstator')

const adminAuth = async (req,res,next)=>{
    try{
    const token = req.header('Authorization').replace('Bearer ','')
    const isMatch = await AdminToken.findOne({where:{token}})

    if(!isMatch){
        throw new Error();
    }

    const decoded = jwt.verify(token,process.env.JWTSECRET)
    const adminResult = await Admin.findOne({where:{email:decoded.email}})

    if(!adminResult){
        throw new Error();
    }

    req.token = token;
    req.admin = adminResult;

    next();

    }catch(error){
        res.status(401).send({error:'Please authenticate.'})
    }
}

module.exports = adminAuth