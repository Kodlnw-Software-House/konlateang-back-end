const {DataTypes} = require('sequelize')
const sequelize = require('../db/sequelize')

const {Isolation} = require('./isolation')
const Status = require('./status')
const {Patient} = require('./patient')

const Booking = sequelize.define('booking',{
    patient_id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false
    },
    community_isolation_id:{
        type: DataTypes.INTEGER,
    }
},{
    timestamps: true,
    createdAt: 'create_at',
    updatedAt: false
})

Booking.belongsTo(Isolation,{foreignKey:'community_isolation_id',targetKey:'community_isolation_id'})
Booking.belongsTo(Patient,{foreignKey:'patient_id',targetKey:'patient_id'})
Booking.belongsTo(Status,{foreignKey:'status_id'})

module.exports = Booking