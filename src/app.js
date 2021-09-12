const express = require('express')
const adminRouter = require('./routers/adminstator')
const multer = require('multer')
const upload = multer()

const hospitalRouter = require('./routers/hospital')
const patientRouter = require('./routers/patient')
const isolationRouter = require('./routers/isolation')
const bookingRouter = require('./routers/booking')
const app = express();

const port = process.env.PORT

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(upload.array())

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