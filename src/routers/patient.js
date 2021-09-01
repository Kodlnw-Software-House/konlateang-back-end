const express = require('express');
const jwt = require('jsonwebtoken')

const router = new express.Router();
const {patientAuth} = require('../middleware/auth')
const {Patient,PatientToken} = require('../models/patient')

 router.get('/getall',async(req,res)=>{
    try{
        const patients = await Patient.findAll({attributes:{
            exclude:['password']
        }});
        res.status(200).send({patients})
    }catch(error){
        res.status(500).send()
    }
 })

 router.post('/login',async (req,res)=>{
     try{
     const patient = await Patient.verifyLogin(req.body.email,req.body.password);
     const token = jwt.sign({email:patient.email},process.env.JWTSECRET);
     await PatientToken.create({token,patient_id:patient.patient_id});
     res.status(201).send({refreshToken:token});
     }catch(error){
         res.status(500).send({error:error.message});
     }
 })

 router.get('/token',patientAuth,async (req,res)=>{
     jwt.sign({email:req.patient.email},process.env.JWTACCESSTOKEN,{expiresIn:'15s'}, (error,result)=>{
        if(error){
            return res.status(500).send();
        }
        res.status(201).send({accessToken:result});
     })
 })

 router.delete('/logout',patientAuth,async (req,res)=>{
    try{
        await PatientToken.destroy({where:{token:req.token}});
        res.status(200).send();
    }catch(error){
        res.status(500).send({error:error.message});
    }
 })

router.post('/register',async (req,res)=>{
    try{
        const newPatient = await Patient.create(req.body);
        const token = jwt.sign({email:newPatient.email},process.env.JWTSECRET);
        await PatientToken.create({token,patient_id:newPatient.patient_id});
        res.status(200).send({newPatient,refreshToken:token});
    }catch(error){
        res.status(400).send({error});
    }
})

 module.exports = router
