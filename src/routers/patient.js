const express = require('express');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const multer = require('multer')
const sharp = require('sharp')

const router = new express.Router();
const {auth} = require('../middleware/auth')
const {Patient,PatientToken} = require('../models/patient')

const upload = multer()
const uploadAvatar = multer({
    limits:{
        fileSize: (1024*1024*4) //4MB
    },
    fileFilter(req,file,cb){
        if(!file.originalname.match(/\.(png|jpeg|jpg)$/)){
            return cb(new Error('Please upload image'));
        }
        cb(undefined,true);
    }
})

 router.get('/getall',async(req,res)=>{
    try{
        const patients = await Patient.findAll({attributes:{
            exclude:['password','avatar']
        }});
        res.status(200).send({patients})
    }catch(error){
        res.status(500).send()
    }
 })

 router.get('/me',auth('PATIENT'),async(req,res)=>{
    res.send(req.patient);
 })

 router.post('/login',upload.array(),async (req,res)=>{
     try{
     const patient = await Patient.verifyLogin(req.body.email,req.body.password);
     delete patient.dataValues.password
     const token = jwt.sign({email:patient.email},process.env.JWTSECRET);
     await PatientToken.create({token,patient_id:patient.patient_id});
     res.status(201).send({patient,token,tokenType:'Bearer'});
     }catch(error){
         res.status(400).send({error:error.message});
     }
 })
 router.delete('/logout',auth('PATIENT'),async (req,res)=>{
    try{
        await PatientToken.destroy({where:{token:req.token}});
        res.status(200).send();
    }catch(error){
        res.status(500).send({error:error.message});
    }
 })

router.post('/register',upload.array(),async (req,res)=>{
    try{
        const newPatient = await Patient.create(req.body);
        delete newPatient.dataValues.password
        const token = jwt.sign({email:newPatient.email},process.env.JWTSECRET);
        await PatientToken.create({token,patient_id:newPatient.patient_id});
        res.status(201).send({patient:newPatient,token,tokenType:'Bearer'});
    }catch(error){
        res.status(400).send({error:error.message});
    }
})

router.put('/edit',upload.array(),auth('PATIENT'), async (req,res)=>{
    try{
        const updates = Object.keys(req.body);
        const allowedUpdates = ['address','dob','password'];
        const isValidOperation = updates.every((update)=> allowedUpdates.includes(update));
        if(!isValidOperation){
            return res.status(400).send({ error:'Invalid updates!'});
        }
        req.body.password = !req.body.password ? undefined : await bcrypt.hash(req.body.password,8);

        await Patient.update(req.body,{
            where:{
                patient_id: req.patient.patient_id
            }
        })

        const editedPatient = await Patient.findOne({
            where:{
                patient_id: req.patient.patient_id
            },
            attributes:{
                exclude:['password','avatar']
            }
        })
        res.status(200).send({editedPatient})
    }catch(error){
        res.status(400).send({error:error.message});
    }
})

router.post('/upload',auth('PATIENT'),uploadAvatar.single('avatar'), async(req,res)=>{
    try{
        const buffer = await sharp(req.file.buffer).resize({width:250,height:250}).toBuffer()
        const blobFile = 'data:'+req.file.mimetype+';base64,'+buffer.toString('base64')
        const uploadAvatar = await Patient.update({avatar:blobFile},{
            where:{
                patient_id: req.patient.patient_id
            }
        })
        if(uploadAvatar[0]===0){
            return res.status(400).send('Upload file Failed.')
        }
        res.status(200).send({status:'Upload file successful !'})
    }catch(error){
        res.status(500).send({error:error.message})
    }
})

router.get('/avatar/:id',async(req,res)=>{
    try{
    const patient = await Patient.findOne({where:{
        patient_id: req.params.id
    }})
    if(!patient.avatar){
        return res.status(500).send({error:'image not found'})
    }
    const rawfile = Buffer.from(patient.avatar,'base64')
    const m = /^data:(.+?);base64,(.+)$/.exec(rawfile)
    if (!m) throw new Error()
    const [ _, content_type, file_base64 ] = m
    const file = Buffer.from(file_base64,'base64')
    res.set({
    'Content-Type': content_type,
    'Content-Length': file.length,
    })
    res.end(file)
        }catch(error){
            res.status(500).send({error:error.message})
        }
})

 module.exports = router
