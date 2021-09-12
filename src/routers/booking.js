const express = require('express')

const router = new express.Router();
const Booking = require('../models/booking')
const {Patient} = require('../models/patient')
const Status = require('../models/status')
const {Isolation} = require('../models/isolation')

router.get('/getall',async (req,res)=>{
    try{
        const bookings = await Booking.findAll({
            include:[{
                model: Patient,
                attributes:{
                    exclude:['password']
                }
            },Status,Isolation
            ]
        });
        res.status(200).send({bookings})
    }catch(error){
        res.status(500).send({error:error.message})
    }
})

router.post('/create',async (req,res)=>{
    try{
        const booking = await Booking.create(req.body)
        res.status(200).send({booking})
    }catch(error){
        res.status(500).send({error:error.message})
    }
})

module.exports = router