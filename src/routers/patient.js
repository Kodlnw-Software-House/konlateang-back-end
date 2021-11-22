const express = require('express');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const multer = require('multer')
const sharp = require('sharp')

const router = new express.Router();
const {auth} = require('../middleware/auth')
const {Patient,PatientToken} = require('../models/patient')
const Booking = require('../models/booking');
const { Isolation } = require('../models/isolation');
const { Op } = require('sequelize');
const Status = require('../models/status');

const upload = multer()
const uploadAvatar = multer({
    limits:{
        fileSize: (1024*1024*4) //4MB
    },
    fileFilter(req,file,cb){
        if(!file.originalname.match(/\.(png|jpeg|jpg|JPG|JPEG|PNG)$/)){
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
        res.status(500).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'})
    }
 })

 router.get('/me',auth('PATIENT'),async(req,res)=>{
    const booking = await Booking.findAll({
        where:{
        patient_id:req.patient.patient_id,
        },
        include:[Isolation,Status]
    })
    res.send({patient:req.patient,booking});
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
        res.status(500).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'});
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
        res.status(400).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'});
    }
})

router.put('/edit',upload.array(),auth('PATIENT'), async (req,res)=>{
    try{
        const updates = Object.keys(req.body);
        const allowedUpdates = ['address','tel','password'];
        const isValidOperation = updates.every((update)=> allowedUpdates.includes(update));
        if(!isValidOperation){
            return res.status(400).send({ error:'ข้อมูลการอัพเดตไม่ถูกต้อง!'});
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
        res.status(400).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'});
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
            return res.status(400).send({error:'ไม่สามารถอัพโหลดรูปภาพได้โปรดลองในภายหลัง'})
        }
        res.status(200).send({status:'อัพโหลดรูปภาพเสร็จสิ้น!'})
    }catch(error){
        res.status(500).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'})
    }
})

router.get('/avatar/:id',async(req,res)=>{
    try{
    const patient = await Patient.findOne({where:{
        patient_id: req.params.id
    }})
    if(!patient.avatar){
        return res.status(500).send({error:'ไม่พบข้อมูลรูปภาพในระบบ'})
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
            res.status(500).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'})
        }
})

router.post('/booking',auth('PATIENT'),async (req,res)=>{
    try{
        const checkHasBooking = await Booking.findAll({where:{
            patient_id: req.patient.patient_id,
            status_id: {
                [Op.or]:[2,4]
            }
        }})
        if(checkHasBooking.length !==0){
            return res.status(400).send({error:'คุณได้จองศุนย์พักคอยเรียบร้อยแล้ว!'})
        }

        const bookingLeft = await Booking.count({
            where:{
                community_isolation_id: req.body.community_isolation_id,
                status_id: {
                    [Op.or]:[2,4]
                }
            }
        })

        
        const isolation = await Isolation.findOne({
            where:{
                community_isolation_id: req.body.community_isolation_id
            }
        })

        if(bookingLeft==isolation.dataValues.available_bed){
            return res.status(400).send({error:'ศุนย์พักคอยนี้เต็มเรียบร้อยแล้ว!'})
        }

        await Booking.create({
            status_id: 2,
            patient_id: req.patient.patient_id,
            community_isolation_id: req.body.community_isolation_id
        })
        res.status(200).send()
    }catch(error){
        res.status(500).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'})
    }
})

router.get('/getBookings',auth('PATIENT'),async (req,res)=>{
    try{
        const bookings = await Booking.findAll({where:{
            patient_id: req.patient.patient_id
        },
        include:[Isolation,Status]
    }) 
        res.status(200).send({bookings})
    }catch(error){
        res.status(500).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'})
    }
})

router.get('/checkEmailInUse',async(req,res)=>{
    try{
        const email = await Patient.findOne({where:{email:req.query.email}})
        if(email){
            return res.status(400).send({error:req.query.email+' ถูกใช้ไปแล้ว!'})
        }
        res.status(200).send()
    }catch(error){
        res.status(500).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'})
    }
})

router.get('/checkCitizenIdInUse',async(req,res)=>{
    try{
        const citizenId = await Patient.findOne({where:{citizen_id:req.query.citizen_id}})
        if(citizenId){
            return res.status(400).send({error:req.query.citizen_id+' ถูกใช้ไปแล้ว!'})
        }
        res.status(200).send()
    }catch(error){
        res.status(500).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'})
    }
})

 module.exports = router
