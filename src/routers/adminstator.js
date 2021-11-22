const express = require('express')
const jwt = require('jsonwebtoken')
const multer = require('multer')

const {Op} = require('sequelize')
const router = new express.Router();
const upload = multer()

const {Admin,AdminToken} = require('../models/adminstator')
const {Patient} = require('../models/patient')
const {auth} = require('../middleware/auth')
const {Isolation,IsolationImage} = require('../models/isolation')
const {Hostipal} = require('../models/hospital')
const Booking = require('../models/booking')
const Status = require('../models/status')

router.post('/login',upload.array(),async (req,res)=>{
    try{
        const admin = await Admin.verifyLogin(req.body.email, req.body.password);
        const token = jwt.sign({email:admin.email}, process.env.JWTSECRET);
        delete admin.dataValues.password
        await AdminToken.create({token, admin_id:admin.admin_id});
        res.status(201).send({admin,token,tokenType:'Bearer'});
    }
    catch(error){
        res.status(400).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'});
    }
})

router.get('/me',auth('ADMIN'),async(req,res)=>{
    delete req.admin.dataValues.password
    res.status(200).send({admin:req.admin})
})

router.delete('/logout',auth('ADMIN'),async(req,res)=>{
    try{
        await AdminToken.destroy({where:{
            token:req.token
        }});
        res.status(200).send();
    }
    catch(error){
        res.status(500).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'});
    }
})

router.get('/getAllPatient',auth('ADMIN'),async(req,res)=>{
    try{
        req.query.pageNumber = !req.query.pageNumber ? 1 : req.query.pageNumber
        const search = req.query.search ? req.query.search : ''
        const searchCitizen = isNaN(parseInt(req.query.search)) ? req.query.search : parseInt(req.query.search)
        const limit = parseInt(req.query.pageSize)
        const offset = limit * (parseInt(req.query.pageNumber)-1)
        const sortby = [
            req.query.sortBy ? req.query.sortBy : "patient_id",
            req.query.sortType ? req.query.sortType : "ASC",
          ];

        const patient = await Patient.findAndCountAll({
            where:{
                [Op.or]:[{
                    fname:{
                        [Op.substring]:search
                    }
                },{
                    lname:{
                        [Op.substring]:search
                    }
                },{
                    citizen_id:{
                        [Op.substring]:searchCitizen
                    }
                }]
            },
            attributes:{
                exclude:['password','avatar']
            },
            offset,
            limit,
            order: [sortby]
        })
        patient.totalPage = Math.ceil(patient.count / limit)
        res.status(200).send({patient})
    }catch(error){
        res.status(500).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'})
    }
})

router.put('/editPatient/:id',auth('ADMIN'),async(req,res)=>{
    try{
        const patient = await Patient.findOne({where:{
            patient_id: req.params.id
            },
            attributes:{
                include:['patient_id']
            }
        })
        if(!patient){
            return res.status(404).send({ error:'ผู้ป่วยไอดี : '+req.params.id+' ไม่พบข้อมูลภายในระบบ!'});
        }
    
        const updates = Object.keys(req.body)
        const allowedUpdates = ['fname','lname','citizen_id','dob','address','tel','gender','age']
        const isValidOperation = updates.every((update)=> allowedUpdates.includes(update))
        if(!isValidOperation){
            return res.status(400).send({ error:'ข้อมูลการอัพเดตไม่ถูกต้อง!'});
        }
    
        await Patient.update(req.body,{where:{
            patient_id: req.params.id
        }})
        res.status(200).send({status:'อัพเดตข้อมูลเสร็จสิ้น!'})
    }catch(error){
        res.status(500).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'})
    }
})

router.get('/getAllIsolation',auth('ADMIN'),async(req,res)=>{
    req.query.pageNumber = !req.query.pageNumber ? 1 : req.query.pageNumber
    const search = req.query.search ? req.query.search : ''
    const limit = parseInt(req.query.pageSize)
    const offset = limit * (parseInt(req.query.pageNumber)-1)
    const sortby = [
        req.query.sortBy ? req.query.sortBy : "community_isolation_id",
        req.query.sortType ? req.query.sortType : "ASC",
      ];

    Isolation.findAndCountAll({
        where:{
            [Op.or]:[{
                community_isolation_name:{
                    [Op.substring]: search
                }
            },
            {
                address:{
                    [Op.substring] : search
                }
            }
        ]
        },
        include:[{
            model: Hostipal,
            as:'Hospital',
            attributes:{
                exclude: ['password']
            }
        }],
        attributes:{
            exclude: ['hospital_id']
        },
        limit,
        offset,
        order: [sortby]
    }).then(async (result)=>{
        for (let i=0;i<result.rows.length;i++) {
            const bookingLeft = await Booking.count({where:
                {
                    community_isolation_id: result.rows[i].community_isolation_id,
                    status_id: {
                        [Op.or]:[2,4]
                    }
                }
            })
            result.rows[i].dataValues.bed_left = result.rows[i].available_bed - bookingLeft;

            const imageIndex = await IsolationImage.findAll({where:
                {
                    community_isolation_id: result.rows[i].community_isolation_id
                },
                attributes:{
                    exclude: ['image_id','image','community_isolation_id']
                },
                order:[['index', 'ASC']]
            })
            result.rows[i].dataValues.image_index = imageIndex.map(u => u.get("index"));
        }
        result.totalPage = Math.ceil(result.count / limit)
        res.status(200).send({result})
    }).catch((error)=>{
        res.status(500).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'})
    })
})

router.get('/getIsolation/:id', auth('ADMIN'), (req,res)=>{
    Isolation.findOne({
        where:{
            community_isolation_id: req.params.id
        },
        include:[{
            model: Hostipal,
            as:'Hospital',
            attributes:{
                exclude: ['password']
            }
        }],
        attributes:{
            exclude: ['hospital_id']
        }
    }).then(async (isolation)=>{
        const bookingLeft = await Booking.count({where:
            {
                community_isolation_id: isolation.community_isolation_id,
                status_id: {
                    [Op.or]:[2,4]
                }
            }
        })
        isolation.dataValues.bed_left = isolation.available_bed - bookingLeft;

        const imageIndex = await IsolationImage.findAll({
            where:{
                community_isolation_id: isolation.community_isolation_id
            },
            attributes:{
                exclude: ['image_id','image','community_isolation_id']
            },
            order:[['index', 'ASC']]
        })
        isolation.dataValues.image_index = imageIndex.map(u => u.get("index"))
    
        res.status(200).send({isolation})
    }).catch((error)=>{
        res.status(500).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'})
    })
})

router.get('/getBooking/:id',auth('ADMIN'),async(req,res)=>{
    try{
        req.query.pageNumber = !req.query.pageNumber ? 1 : req.query.pageNumber
        const limit = parseInt(req.query.pageSize)
        const offset = limit * (parseInt(req.query.pageNumber)-1)

        const booking = await Booking.findAndCountAll({
            include:[{
                model:Patient,
                attributes:{
                    exclude:['password','avatar']
                }
            },Status],
            where:{
                community_isolation_id: req.params.id,
            },
            attributes:{
                exclude:['patient_id','community_isolation_id','status_id']
            },
            offset,
            limit
        })
        booking.totalPage = Math.ceil(booking.count / limit)
        res.status(200).send({booking})
    }catch(error){
        res.status(500).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'})
    }
})

router.put('/editIsolation/:id',upload.array(),auth('ADMIN'),async(req,res)=>{
    try{
        const updates = Object.keys(req.body);
        const allowedUpdates = ['community_isolation_name','address','available_bed'];
        const isValidOperation = updates.every((update)=> allowedUpdates.includes(update));
        
        if(!isValidOperation){
            return res.status(400).send({ error:'ข้อมูลการอัพเดตไม่ถูกต้อง!'});
        }

        const hasAvailableBed = updates.includes('available_bed')
        if(hasAvailableBed){
            const count = await Booking.count({
                where:{
                    community_isolation_id:req.params.id
                }
            })
            if(req.body.available_bed<count){
                return res.status(400).send({error:'จำนวนเตียงที่ใส่จะต้องไม่น้อยกว่าของเดิม!'})
            }
        }

        await Isolation.update(req.body,{
            where:{community_isolation_id:req.params.id}
        })
        res.status(200).send({status:'อัพเดตข้อมูลเสร็จสิ้น!'})
    }catch(error){
        res.status(500).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'})
    }
    
})

router.put('/editStatus/:bookingId',auth('ADMIN'),async(req,res)=>{
    try{
        const booking = await Booking.findOne({
            where:{
                booking_id: req.params.bookingId
            }
        })
        
        const avoidStatus = [1,3]
        if(avoidStatus.includes(booking.status_id)){
            return res.status(400).send({error:'Booking id: '+req.params.bookingId+' ไม่อนุญาตให้อัตเดตเนื่องจากสถานะเป็น done หรือ booking failed แล้ว'})
        }
    
        const updatedBooking = await Booking.update({status_id:req.query.statusId},{
            where:{
                booking_id: req.params.bookingId
            }
        })
    
        if(updatedBooking[0]===0){
            return res.status(400).send({status:'ไม่มีการอัพเดตเกิดขึ้น'})
        }
        res.status(200).send({status:'อัพเดตข้อมูลเสร็จสิ้น!'})
    }catch(error){
        res.status(500).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'})
    }
})

router.post('/uploadImage/:isolationId', auth('ADMIN'),upload.array('files'),async(req,res)=>{
    try{
    
    const count = await IsolationImage.findAll({where:{
        community_isolation_id: req.params.isolationId
    },
    attributes:{
        exclude: ['image','community_isolation_id']
    }})


    if(count.length >= 3){
        throw new Error('รูปภาพถูกจำกัดไว้ได้ไม่เกิน 3 รูป')
    }
    else if(req.files.length + count.length > 3){
        throw new Error('รูปภาพถูกจำกัดไว้ได้ไม่เกิน 3 รูป')
    }
    else if(req.files.length <= 0 || req.files.length > 3){
        throw new Error('การอัพโหลดรูปภาพจะต้องมี 1 ถึง 3 ภาพขึ้นไป')
    }

    const imageIndexArr = count.map(u => u.get("index"))
    const images = []
    let imageCount = 0;
    
    for (let i=0;i<3;i++) {
        if(!imageIndexArr.includes(i) && req.files[imageCount]){
            images.push({
            image:'data:'+req.files[imageCount].mimetype+';base64,'+req.files[imageCount].buffer.toString('base64'),
            index: i,
            community_isolation_id: req.params.isolationId
            })
            imageCount++;
        }
    }
    
        await IsolationImage.bulkCreate(images)
        res.send({status:'อัพโหลดรูปภาพเสร็จสิ้น!'})
    }catch(error){
        res.status(500).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'})
    }
})

router.delete('/deleteIsolationImage/:isolationId/:index', auth('ADMIN'),async (req,res)=>{
    try{
        const deleteIsolation = await IsolationImage.destroy({
            where:{
                community_isolation_id: req.params.isolationId,
                index: req.params.index
            }
        })

        if(deleteIsolation === 0){
            return res.status(404).send({status: 'ไม่พบข้อมูลรูปภาพในระบบ'});
        }

        res.status(200).send({ status: 'ลบรูปภาพเสร็จสิ้น' });
    }catch(error){
        res.status(500).send({error:'มีปัญหาผิดพลาดเกิดขึ้นไม่สามารถดำเนินการได้ โปรดลองในภายหลัง'});
    }
})

module.exports = router;