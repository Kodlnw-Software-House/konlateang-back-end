const express = require('express')
const jwt = require('jsonwebtoken')

const router = new express.Router();

const {Admin,AdminToken} = require('../models/adminstator')
const adminAuth = require('../middleware/auth')

router.post('/login',async (req,res)=>{
    try{
        const admin = await Admin.verifyLogin(req.body.email, req.body.password);
        const token = jwt.sign({email:admin.email}, process.env.JWTSECRET);
        await AdminToken.create({token, admin_id:admin.admin_id});
        res.status(200).send({token});
    }
    catch(error){
        res.status(500).send({error:error.message});
    }
})

router.delete('/logout',adminAuth,async(req,res)=>{
    try{
        await AdminToken.destroy({where:{
            token:req.token
        }})
        res.status(200).send();
    }
    catch(error){
        res.status(500).send({error:error.message});
    }
})

module.exports = router;