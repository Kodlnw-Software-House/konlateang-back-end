const express = require('express')
const app = express()

const cors = require('cors')

const adminRouter = require('./routers/adminstator')
const hospitalRouter = require('./routers/hospital')
const patientRouter = require('./routers/patient')
const isolationRouter = require('./routers/isolation')
const bookingRouter = require('./routers/booking')

const port = process.env.PORT

app.use(cors({
    origin: process.env.ORIGIN,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTION']
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/admin',adminRouter)
app.use('/hospital',hospitalRouter)
app.use('/patient',patientRouter)
app.use('/isolation',isolationRouter)
app.use('/booking',bookingRouter)

app.get('/health',(req,res)=>{
    res.send({status:'This service is healthy.'})
})

app.listen(port,()=>{
    console.log('Server is up on port '+port);
})