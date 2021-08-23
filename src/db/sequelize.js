const { Sequelize } = require('sequelize')

const sequelize = new Sequelize(process.env.MYSQL_URI,{
    logging:false,
    define:{
        timestamps:false,
        freezeTableName:true
    }
})

module.exports = sequelize