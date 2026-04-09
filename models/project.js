const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const projectSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    image: {
        url: String,
        filename: String,
    },
    location: {
        type: String,
        required: true,
    },
    totalBudget: {
        type: Number,
        required: true,
    },
    startDate: Date,
    endDate: Date,
}, { timestamps: true });


const Project = mongoose.model("Project", projectSchema);
module.exports = Project;