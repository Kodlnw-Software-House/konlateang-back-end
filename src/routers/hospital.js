const express = require('express')
const jwt = require('jsonwebtoken')
const multer = require('multer')

const router = new express.Router();

const upload = multer()

const { Op } = require('sequelize');

const {Hostipal,HospitalToken} = require('../models/hospital')
const Booking = require('../models/booking')
const Status = require('../models/status')
const {Patient} = require('../models/patient')
const {auth} = require('../middleware/auth');
const { Isolation,IsolationImage } = require('../models/isolation');

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
        delete hospital.dataValues.password
        const token = jwt.sign({email:hospital.email}, process.env.JWTSECRET);
        await HospitalToken.create({token,hospital_id:hospital.hospital_id});
        res.status(201).send({hospital,token,tokenType:'Bearer'});
    }catch(error){
        res.status(400).send({error:error.message});
    }
})

router.get('/me',auth('HOSPITAL'),async(req,res)=>{
    res.status(200).send({hospital:req.hospital})
})

router.get('/getIsolations',auth('HOSPITAL'),async(req,res)=>{
    const isolation = await Isolation.findAll({where:{
        hospital_id: req.hospital.hospital_id
    }})

    for (let i=0;i<isolation.length;i++) {
        const bookingLeft = await Booking.count({where:
            {
                community_isolation_id: isolation[i].community_isolation_id,
                status_id: {
                    [Op.or]:[2,4]
                }
            }
        })
        isolation[i].dataValues.bed_left = isolation[i].available_bed - bookingLeft;

        const imageIndex = await IsolationImage.findAll({
            where:{
                community_isolation_id: isolation[i].community_isolation_id
            },
            attributes:{
                exclude: ['image_id','image','community_isolation_id']
            },
            order:[['index', 'ASC']]
        })
        isolation[i].dataValues.image_index = imageIndex.map(u => u.get("index"))
    }
    res.status(200).send({isolation})
})

router.get('/getIsolation/:id',auth('HOSPITAL'),async(req,res)=>{
    const isolation = await Isolation.findOne({where:{
        community_isolation_id: req.params.id,
        hospital_id: req.hospital.hospital_id
    }})

    if(!isolation){
        return res.status(404).send({status:'isolation id: '+req.params.id+' not found in your hospital'})
    }

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
            exclude:['image_id','image','community_isolation_id']
        },
        order:[['index', 'ASC']]
    })
    isolation.dataValues.image_index = imageIndex.map(u => u.get("index"))

    res.status(200).send({isolation})
})

router.get('/getBooking/:id',auth('HOSPITAL'),async(req,res)=>{
    try{
        req.query.pageNumber = !req.query.pageNumber ? 1 : req.query.pageNumber
        const limit = parseInt(req.query.pageSize)
        const offset = limit * (parseInt(req.query.pageNumber)-1)

        const isOwner = await Isolation.findOne({where:{
            community_isolation_id: req.params.id,
            hospital_id: req.hospital.hospital_id
        }})

        if(!isOwner){
            return res.status(404).send({status:'isolation id: '+req.params.id+' not found in your hospital'})
        }

        const booking = await Booking.findAndCountAll({
            include:[{
                model:Patient,
                attributes:{
                    exclude:['password','avatar']
                }
            },Status,{
                model: Isolation,
                attributes:[],
                where:{
                    hospital_id: req.hospital.hospital_id
                }
            }],
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
        res.status(500).send({error:error.message})
    }
})

router.post('/createIsolation',upload.array('files'),auth('HOSPITAL'),async(req,res)=>{
    try{
        const isolation = await Isolation.create({
            community_isolation_name:req.body.community_isolation_name,
            address:req.body.address,
            available_bed: req.body.available_bed,
            hospital_id: req.hospital.hospital_id
        })
        return res.status(200).send({community_isolation_id:isolation.community_isolation_id})
    }catch(error){
        res.status(500).send({error:error.message})
    }
})

router.post('/uploadImage/:isolationId', auth('HOSPITAL'),upload.array('files'),async(req,res)=>{
    try{
    const isOwner = await Isolation.findOne({where:{
        community_isolation_id: req.params.isolationId,
        hospital_id: req.hospital.hospital_id
    }})
    
    if(!isOwner){
        return res.status(404).send({status:'isolation id: '+req.params.isolationId+' not found in your hospital'})
    }
    
    const count = await IsolationImage.findAll({where:{
        community_isolation_id: req.params.isolationId
    },
    attributes:{
        exclude: ['image','community_isolation_id']
    }})


    if(count.length >= 3){
        throw new Error('images are limit at 3 pictures.')
    }
    else if(req.files.length + count.length > 3){
        throw new Error('images are limit at 3 pictures.')
    }
    else if(req.files.length <= 0 || req.files.length > 3){
        throw new Error('images upload limit between 1 and 3 pictures.')
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
        res.send({status:'upload images successful.'})
    }catch(error){
        res.status(500).send({error:error.message})
    }
})

router.get('/getImage/:isolationId/:index', async (req,res)=>{
    try{
    const image = await IsolationImage.findOne({
        where: {
            community_isolation_id: req.params.isolationId,
            index: req.params.index
        }
    })
    if(!image){
        return res.status(404).send({error:'image not found'})
    }
    const rawfile = Buffer.from(image.image,'base64')
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

router.get('/getImageCount/:isolationId',(req,res)=>{
    IsolationImage.count({
        where:{
            community_isolation_id: req.params.isolationId
        }
    }).then((count)=>{
        res.send({count})
    }).catch((error)=>{
        res.status(500).send({error:error.message})
    })
})

router.put('/edit/:id',upload.array(),auth('HOSPITAL'),async(req,res)=>{
    try{
        const updates = Object.keys(req.body);
        const allowedUpdates = ['community_isolation_name','address','available_bed'];
        const isValidOperation = updates.every((update)=> allowedUpdates.includes(update));
        
        if(!isValidOperation){
            return res.status(400).send({ error:'Invalid updates!'});
        }

        const hasAvailableBed = updates.includes('available_bed')
        if(hasAvailableBed){
            const count = await Booking.count({
                where:{
                    community_isolation_id:req.params.id
                }
            })
            if(req.body.available_bed<count){
                return res.status(400).send({error:'available_bed must not less than original.'})
            }
        }

        await Isolation.update(req.body,{
            where:{community_isolation_id:req.params.id}
        })
        res.status(200).send({status:'update successful.'})
    }catch(error){
        res.status(500).send({error:error.message})
    }
    
})

router.put('/editStatus/:isolationId/:bookingId',auth('HOSPITAL'),async(req,res)=>{
    const isOwner = await Isolation.findOne({where:{
        community_isolation_id: req.params.isolationId,
        hospital_id: req.hospital.hospital_id
    }})

    if(!isOwner){
        return res.status(404).send({status:'isolation id: '+req.params.isolationId+' not found in your hospital'})
    }

    await Booking.update({status_id:req.query.statusId},{
        where:{
            booking_id: req.params.bookingId
        }
    }).then((result)=>{
        if(result[0]===0){
            return res.status(200).send({status:'noting to update.'})
        }
        res.status(200).send({status:'update successful.'})
    }).catch((error)=>{
        res.status(500).send({error:error.message})
    })
})

router.put('/editIsolationImage/:isolationId/:index', auth('HOSPITAL'),upload.single('file'),async (req,res)=>{
    try{
        const isOwner = await Isolation.findOne({where:{
            community_isolation_id: req.params.isolationId,
            hospital_id: req.hospital.hospital_id
        }})
    
        if(!isOwner){
            return res.status(404).send({status:'isolation id: '+req.params.isolationId+' not found in your hospital'})
        }
        
        if(!req.params.isolationId || !req.params.index){
            res.status(404).send({status:'file not found!'})
        }else if(!req.file){
            res.status(400).send({status:'required image file!'})
        }
        else{
            const newImage = {
                image:'data:'+req.file.mimetype+';base64,'+req.file.buffer.toString('base64')
            }
            await IsolationImage.update(newImage,{
                where:{
                    community_isolation_id: req.params.isolationId,
                    index: req.params.index
                }
            })
            res.send({status:'Update image successful!'})
        }
    }
    catch(error){
        res.status(500).send({error:error.message})
    }
})

router.delete('/deleteIsolationImage/:isolationId/:index', auth('HOSPITAL'),async (req,res)=>{
    try{
        const isOwner = await Isolation.findOne({where:{
            community_isolation_id: req.params.isolationId,
            hospital_id: req.hospital.hospital_id
        }})
    
        if(!isOwner){
            return res.status(404).send({status:'isolation id: '+req.params.isolationId+' not found in your hospital'})
        }

        const deleteIsolation = await IsolationImage.destroy({
            where:{
                community_isolation_id: req.params.isolationId,
                index: req.params.index
            }
        })

        if(deleteIsolation === 0){
            return res.status(404).send({status: "isolationImage not found!"});
        }

        res.status(200).send({ status: "delete successful!" });
    }catch(error){
        res.status(500).send({error:error.message});
    }
})

router.delete('/logout', auth('HOSPITAL'),async (req,res)=>{
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