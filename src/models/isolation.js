const {DataTypes} = require('sequelize')
const sequelize = require('../db/sequelize')
const {Hostipal} = require('./hospital')

const Isolation = sequelize.define('community_isolation',{
    community_isolation_id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true
    },
    community_isolation_name:{
        type: DataTypes.STRING(45),
        allowNull: false,
        unique: 'community_isolation_name_UNIQUE'
    },
    address:{
        type: DataTypes.STRING(500),
        allowNull: false
    },
    available_bed:{
        type: DataTypes.INTEGER,
        allowNull: false
    }
})

Isolation.belongsTo(Hostipal,{foreignKey:'hospital_id',as:'Hospital'})

const IsolationImage = sequelize.define('community_isolation_image',{
    image_name:{
        type: DataTypes.BLOB('long'),
        allowNull: false
    }
})

IsolationImage.belongsTo(Isolation,{foreignKey:'community_isolation_id'})

module.exports = {Isolation,IsolationImage}