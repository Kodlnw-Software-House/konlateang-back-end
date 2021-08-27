const express = require('express')
const adminRouter = require('./routers/adminstator')
const hospitalRouter = require('./routers/hospital')
const app = express();

const port = process.env.PORT

app.use(express.json())
app.use('/admin',adminRouter)
app.use('/hospital',hospitalRouter)

app.get('/health',(req,res)=>{
    res.send({status:'This service is healthy.'})
})

app.listen(port,()=>{
    console.log('Server is up on port '+port);
})