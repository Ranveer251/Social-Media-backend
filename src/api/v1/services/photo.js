const axios = require('axios');
const { photos_api_url } = require('../../../config/strings');

const uploadFile = async (file) => {
    console.log(file);
    let formData = new FormData();
    formData.append('image',file);
    axios.post(photos_api_url+'/images',formData,{
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
    .then((res) => {
        console.log(res);
        return photos_api_url+res.imagePath;
    })
    .catch(err => console.log(err));
}

module.exports = {
    uploadFile
}