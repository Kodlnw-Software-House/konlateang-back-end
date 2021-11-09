const express = require('express')

const {Isolation, IsolationImage} = require('../models/isolation')
const {Hostipal} = require('../models/hospital')
const Booking = require('../models/booking')
const {Op} = require('sequelize')
const router = new express.Router();

router.get('/getall',(req,res)=>{
    req.query.pageNumber = !req.query.pageNumber ? 1 : req.query.pageNumber
    const search = req.query.search ? req.query.search : ''
    const limit = parseInt(req.query.pageSize)
    const offset = limit * (parseInt(req.query.pageNumber)-1)
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
    }).then(async (result)=>{
        for (let i=0;i<result.rows.length;i++) {
            const bookingLeft = await Booking.count({where:
                {
                    community_isolation_id: result.rows[i].community_isolation_id
                }
            })
            result.rows[i].dataValues.bed_left = result.rows[i].available_bed - bookingLeft;

            const imageCount = await IsolationImage.count({where:
                {
                    community_isolation_id: result.rows[i].community_isolation_id
                }
            })
            result.rows[i].dataValues.imageCount = imageCount;
        }
        result.totalPage = Math.ceil(result.count / limit)
        res.status(200).send({result})
    }).catch((error)=>{
        res.status(500).send({error:error.message})
    })
})

router.get('/get/:id', (req,res)=>{
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
                community_isolation_id: isolation.community_isolation_id
            }
        })
        isolation.dataValues.bed_left = isolation.available_bed - bookingLeft;

        const imageCount = await IsolationImage.count({
            where:{
                community_isolation_id: isolation.community_isolation_id
            }
        })
        isolation.dataValues.imageCount = imageCount;
    
        res.status(200).send({isolation})
    }).catch((error)=>{
        res.status(500).send({error:error.message})
    })
})

module.exports = router