const express = require('express')

const {Isolation} = require('../models/isolation')
const {Hostipal} = require('../models/hospital')
const router = new express.Router();

router.get('/getall',async (req,res)=>{
    await Isolation.findAll({
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
    }).then((result)=>{
        res.status(200).send({result})
    }).catch((error)=>{
        res.status(500).send({error:error.message})
    })
})

module.exports = router