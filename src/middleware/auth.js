const jwt = require('jsonwebtoken')
const {Admin,AdminToken} = require('../models/adminstator')
const {Hostipal,HospitalToken} = require('../models/hospital')
const {Patient,PatientToken} = require('../models/patient')

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

const patientAuth = async (req,res,next)=>{
    try{
        const token = req.header('Authorization').replace('Bearer ','')
        const isMatch = await PatientToken.findOne({where:{token}});
        if(!isMatch){
            throw new Error();
        }
        const decoded = jwt.verify(token,process.env.JWTSECRET);
        const patientResult = await Patient.findOne({where:{email:decoded.email}});
        if(!patientResult){
            throw new Error();
        }

        req.token = token;
        req.patient = patientResult;

        next();
    }catch(error){
        res.status(401).send({error:'Please authenticate.'})
    }
}

const adminAccessAuth = async (req,res,next) =>{
    try{
        const accessToken = req.header('Authorization').replace('Bearer ','')
        const decoded = jwt.verify(accessToken,process.env.JWTACCESSTOKEN);
        const adminResult = await Admin.findOne({where:{email:decoded.email}})
        if(!adminResult){
            throw new Error();
        }
        req.admin = adminResult;

        next();
    }catch(error){
        res.status(401).send({error:'Please authenticate.'})
    }
}

const hospitalAccessAuth = async(req,res,next) =>{
    try{
        const accessToken = req.header('Authorization').replace('Bearer ','')
        const decoded = jwt.verify(accessToken,process.env.JWTACCESSTOKEN);
        const hospitalResult = await Hostipal.findOne({where:{email:decoded.email}})
        if(!hospitalResult){
            throw new Error();
        }
        req.hospital = hospitalResult;

        next();
    }catch(error){
        res.status(401).send({error:'Please authenticate.'})
    }
}

const patientAccessAuth = async(req,res,next)=>{
    try{
        const accessToken = req.header('Authorization').replace('Bearer ','')
        const decoded = jwt.verify(accessToken,process.env.JWTACCESSTOKEN);
        const patientResult = await Patient.findOne({where:{email:decoded.email}})
        if(!patientResult){
            throw new Error();
        }
        req.patient = patientResult;

        next();
    }catch(error){
        res.status(401).send({error:'Please authenticate.'})
    }
}

module.exports = {
    adminAuth,
    hospitalAuth,
    patientAuth,
    adminAccessAuth,
    hospitalAccessAuth,
    patientAccessAuth
}