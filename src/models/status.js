const {DataTypes} = require('sequelize')
const sequelize = require('../db/sequelize')

const Status = sequelize.define('status',{
    status_id:{
        type:DataTypes.INTEGER,
        primaryKey:true,
        allowNull:false,
        autoIncrement:true
    },
    status_name:{
        type: DataTypes.STRING(45),
        allowNull: false,
        unique: 'status_name_UNIQUE'
    }
})

module.exports = Status