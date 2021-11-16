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

router.post('/login',upload.array(),async (req,res)=>{
    try{
        const admin = await Admin.verifyLogin(req.body.email, req.body.password);
        const token = jwt.sign({email:admin.email}, process.env.JWTSECRET);
        delete admin.dataValues.password
        await AdminToken.create({token, admin_id:admin.admin_id});
        res.status(201).send({admin,token,tokenType:'Bearer'});
    }
    catch(error){
        res.status(400).send({error:error.message});
    }
})

router.delete('/logout',auth('ADMIN'),async(req,res)=>{
    try{
        await AdminToken.destroy({where:{
            token:req.token
        }});
        res.status(200).send();
    }
    catch(error){
        res.status(500).send({error:error.message});
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
        res.status(500).send({error:error.message})
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
            return res.status(404).send({ error:'patient id '+req.params.id+' not found!'});
        }
    
        const updates = Object.keys(req.body)
        const allowedUpdates = ['fname','lname','citizen_id','dob','address','tel','gender']
        const isValidOperation = updates.every((update)=> allowedUpdates.includes(update))
        if(!isValidOperation){
            return res.status(400).send({ error:'Invalid updates!'});
        }
    
        await Patient.update(req.body,{where:{
            patient_id: req.params.id
        }})
        res.status(200).send({status:'update successful !'})
    }catch(error){
        res.status(500).send({error:error.message})
    }
})

router.get('/getAllIsolation',auth('ADMIN'),async(req,res)=>{
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

module.exports = router;