const jwt = require('jsonwebtoken')
const {Admin,AdminToken} = require('../models/adminstator')
const {Hostipal,HospitalToken} = require('../models/hospital')

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

const hospitalAuth = async (req,res,next)=>{
    try{
        const token = req.header('Authorization').replace('Bearer ','')
        const isMatch = await HospitalToken.findOne({where:{token}})

        if(!isMatch){
            throw new Error();
        }

        const decoded = jwt.verify(token,process.env.JWTSECRET);
        const hospitalResult = await Hostipal.findOne({where:{email:decoded.email}})

        if(!hospitalResult){
            throw new Error();
        }

        req.token = token;
        req.hospital = hospitalResult;

        next();

    }catch(error){
        res.status(401).send({error:'Please authenticate.'})
    }
}

module.exports = {adminAuth,hospitalAuth}