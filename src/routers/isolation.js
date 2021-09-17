const express = require('express')

const {Isolation} = require('../models/isolation')
const {Hostipal} = require('../models/hospital')
const {Op} = require('sequelize')
const router = new express.Router();

router.get('/getall',async (req,res)=>{
    const limit = parseInt(req.query.pageSize)
    const offset = limit * parseInt(req.query.pageNumber)
    const search = req.query.search ? req.query.search : ''
    await Isolation.findAll({
        where:{
            [Op.or]:[{
                community_isolation_name:{
                    [Op.substring]: '%' + search + '%'
                }
            },
            {
                address:{
                    [Op.substring] : search
                }
            },
            ]
        },
        include:[{
            model: Hostipal,
            as:'Hospital',
            where:{
                [Op.or]:[{
                    hospital_name:{
                        [Op.substring] : search
                    }
                }]
            },
            attributes:{
                exclude: ['password']
            }
        }],
        attributes:{
            exclude: ['hospital_id']
        },
        limit,
        offset,
    }).then((result)=>{
        res.status(200).send({result})
    }).catch((error)=>{
        res.status(500).send({error:error.message})
    })
})

module.exports = router