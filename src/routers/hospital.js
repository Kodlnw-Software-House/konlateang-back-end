const express = require('express')
const jwt = require('jsonwebtoken')

const router = new express.Router();

const {Hostipal,HospitalToken} = require('../models/hospital')
const {auth} = require('../middleware/auth')

router.get('/getall',async (req,res)=>{
    try{
        const hospitalResult = await Hostipal.findAll({
            attributes:['hospital_name','email']
        });
        res.status(200).send(hospitalResult);
    }catch(error){
        res.status(500).send();
    }
})

router.post('/login',async (req,res)=>{
    try{
        const hospital = await Hostipal.verifyLogin(req.body.email,req.body.password);
        const token = jwt.sign({email:hospital.email}, process.env.JWTSECRET);
        await HospitalToken.create({token,hospital_id:hospital.hospital_id});
        res.status(201).send({refreshToken:token});
    }catch(error){
        res.status(500).send({error:error.message});
    }
})

router.get('/token', auth('HOSPITAL','REFRESH'),async (req,res)=>{
    jwt.sign({email:req.hospital.email},process.env.JWTACCESSTOKEN,{expiresIn: '15s'},(error,result)=>{
        if(error){
            return res.status(500).send();
        }
        res.status(201).send({accessToken:result});
    });
})

router.delete('/logout', auth('HOSPITAL','REFRESH'),async (req,res)=>{
    try{
        await HospitalToken.destroy({
            where:{
                token:req.token
            }
        });
        res.status(200).send();
    }catch(error){
        res.status(500).send({error:error.message});
    }
})

module.exports = router;