const { Sequelize } = require('sequelize')

const sequelize = new Sequelize(process.env.MYSQL_URI,{
    define:{
        timestamps:false,
        freezeTableName:true
    }
})

module.exports = sequelize