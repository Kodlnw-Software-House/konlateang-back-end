const express = require('express')
const jwt = require('jsonwebtoken')
const multer = require('multer')

const router = new express.Router();

const upload = multer()

const {Hostipal,HospitalToken} = require('../models/hospital')
const {auth} = require('../middleware/auth');
const { Isolation } = require('../models/isolation');

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
    res.status(200).send({isolation})
})

router.get('/getIsolation/:id',auth('HOSPITAL'),async(req,res)=>{
    const isolation = await Isolation.findOne({where:{
        community_isolation_id: req.params.id,
        hospital_id: req.hospital.hospital_id
    }})
    if(!isolation){
        return res.status(404).send({status:'isolation id: '+req.hospital.hospital_id+' not found in your hospital'})
    }
    res.status(200).send({isolation})
})

router.post('/createIsolation',upload.array(),auth('HOSPITAL'),async(req,res)=>{
    try{
        await Isolation.create({
            community_isolation_name:req.body.community_isolation_name,
            address:req.body.address,
            available_bed: req.body.available_bed,
            hospital_id: req.hospital.hospital_id
        })
        return res.status(200).send()
    }catch(error){
        res.status(500).send({error:error.message})
    }
})

router.put('/edit/:id',upload.array(),auth('HOSPITAL'),async(req,res)=>{
    try{
        const updates = Object.keys(req.body);
        const allowedUpdates = ['community_isolation_name','address','available_bed'];
        const isValidOperation = updates.every((update)=> allowedUpdates.includes(update));
        if(!isValidOperation){
            return res.status(400).send({ error:'Invalid updates!'});
        }
        await Isolation.update(req.body,{
            where:{community_isolation_id:req.params.id}
        })
        res.status(200).send({status:'update successful.'})
    }catch(error){
        res.status(500).send({error:error.message})
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