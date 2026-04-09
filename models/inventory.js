const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const materialSchema = new Schema ({
    name: {
        type: String,
        required: true,
    },
    supplier: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    stock: {
        type: Number,
        required: true,
    },
});

const Material = mongoose.model("Material", materialSchema);
module.exports = Material;