const jwt = require('jsonwebtoken')
const {Admin,AdminToken} = require('../models/adminstator')
const {Hostipal,HospitalToken} = require('../models/hospital')
const {Patient,PatientToken} = require('../models/patient')

const auth = function(role,tokenType){
    return async function (req, res, next){
        try{
        const token = req.header('Authorization').replace('Bearer ','')

        let decoded
        if(tokenType==='REFRESH'){
            decoded = jwt.verify(token,process.env.JWTSECRET)
        }
        else if(tokenType==='ACCESS'){
            decoded = jwt.verify(token,process.env.JWTACCESSTOKEN);
        }
        
        let isMatch
        if(role==='ADMIN'){
            isMatch = await AdminToken.findOne({where:{token}})
            if(!isMatch){
                throw new Error();
            }
            const adminResult = await Admin.findOne({where:{email:decoded.email}})
            if(!adminResult){
                throw new Error();
            }
            req.admin = adminResult
        }
        else if(role==='HOSPITAL'){
            isMatch = await HospitalToken.findOne({where:{token}})
            if(!isMatch){
                throw new Error();
            }
            const hospitalResult = await Hostipal.findOne({where:{email:decoded.email}})
            if(!hospitalResult){
                throw new Error();
            }
            req.hospital = hospitalResult
        }
        else if(role==='PATIENT'){
            isMatch = await PatientToken.findOne({where:{token}});
            if(!isMatch){
                throw new Error();
            }
            const patientResult = await Patient.findOne({where:{email:decoded.email}})
            if(!patientResult){
                throw new Error();
            }
            req.patient = patientResult
        }else{
            throw new Error();
        }

        req.token = token

        next();
        }catch(error){
            res.status(401).send({error:'Please authenticate.'})
        }
    }
}

module.exports = {
    auth
}