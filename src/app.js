const express = require('express')

const app = express();

const port = process.env.PORT

app.use(express.json())

app.get('/health',(req,res)=>{
    res.send({status:'This service is healthy.'})
})

app.listen(port,()=>{
    console.log('Server is up on port '+port);
})