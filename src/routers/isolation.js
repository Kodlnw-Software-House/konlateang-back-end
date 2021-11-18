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
        res.status(500).send({error:error.message})
    })
})

module.exports = router