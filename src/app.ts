declare const XR8: any

const onxrloaded = () => {
  XR8.XrController.configure({
    imageTargetData: [
      require('../image-targets/1_.json'),
      require('../image-targets/1-2.json'),
      require('../image-targets/2-1.json'),
      require('../image-targets/2-2.json'),
      require('../image-targets/3-1.json'),
      require('../image-targets/3-2.json'),
      require('../image-targets/4-1.json'),
      require('../image-targets/4-2.json'),
      require('../image-targets/5-1.json'),
      require('../image-targets/5-2.json'),
      require('../image-targets/6-1.json'),
      require('../image-targets/6-2.json'),
      require('../image-targets/7-1.json'),
      require('../image-targets/7-2.json'),
      require('../image-targets/8-1.json'),
      require('../image-targets/8-2.json'),
      require('../image-targets/9-1.json'),
      require('../image-targets/9-2.json'),
      require('../image-targets/10-1.json'),
      require('../image-targets/10-2.json'),
      require('../image-targets/11-1.json'),
      require('../image-targets/11-2.json'),
      require('../image-targets/12-1.json'),
      require('../image-targets/12-2.json'),
      require('../image-targets/eating.json'),
      require('../image-targets/meeting.json'),
      require('../image-targets/vacation.json'),
      require('../image-targets/outofoffice.json'),
      require('../image-targets/beach-target.json'),
      require('../image-targets/palms-target.json'),
      require('../image-targets/front.json'),
    ],
  })
}

window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)
