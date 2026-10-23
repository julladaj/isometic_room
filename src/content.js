export const OBJECTS = {
  monitors: { name: 'จอทำงาน', english: 'A window for your ideas', icon: 'monitor', tag: 'WORKSPACE', description: 'เปิดโน้ตบนจอ แล้วเก็บไอเดียดี ๆ ไว้ก่อนจะหายไป', anchor: [.29, 1.28, -1.34] },
  lamp: { name: 'โคมไฟ', english: 'A little pool of light', icon: 'lamp', tag: 'LIGHTING', description: 'แสงอุ่นเล็ก ๆ สำหรับช่วงเวลาที่อยากอยู่กับงานตรงหน้า', anchor: [-.43, 1.25, -1.34] },
  chair: { name: 'เก้าอี้ตัวโปรด', english: 'Take a little spin', icon: 'chair', tag: 'TAKE A SEAT', description: 'พักมือสักนิด ลองหมุนเก้าอี้ แล้วมองพื้นที่เดิมจากมุมใหม่', anchor: [.45, 1.05, .2] },
  rug: { name: 'พรมทอ', english: 'Set the mood, softly', icon: 'palette', tag: 'MAKE IT YOURS', description: 'ลายทอเดิมในสามเฉดสี เลือกสีที่เข้ากับอารมณ์วันนี้', anchor: [.95, .075, 1.05] },
  door: { name: 'ประตูห้อง', english: 'Let the outside in', icon: 'door', tag: 'COME ON IN', description: 'เปิดรับไอเดียใหม่ หรือปิดประตูเพื่อเก็บช่วงเวลาสงบไว้', anchor: [-1.82, 1.25, 1.2] },
  books: { name: 'ชั้นหนังสือ', english: 'A shelf of possibilities', icon: 'book', tag: 'KEEP LEARNING', description: 'สามแหล่งเรียนรู้สำหรับสร้างพื้นที่ดิจิทัลของคุณเอง', anchor: [-1.45, 2.12, -1.2] },
  computer: { name: 'คอมพิวเตอร์', english: 'Power your next idea', icon: 'power', tag: 'ON / OFF', description: 'เปิดเครื่องเพื่อทำงาน หรือปิดจอเมื่อถึงเวลาพัก', anchor: [1.57, .4, -.96] },
  mug: { name: 'แก้วกาแฟ', english: 'Small breaks, better ideas', icon: 'coffee', tag: 'FOCUS & UNWIND', description: 'ทำงาน 25 นาที แล้วให้เวลากับตัวเองอีก 5 นาที', anchor: [1.3, .94, -.99] },
  art: { name: 'ภาพติดผนัง', english: 'A different point of view', icon: 'image', tag: 'WALL GALLERY', description: 'เปลี่ยนพาเลตภาพบนผนัง ให้พื้นที่สะท้อนสไตล์ของคุณ', anchor: [-1.83, 1.94, .33] },
  sign: { name: 'ป้ายไฟ', english: 'A signature glow', icon: 'sparkles', tag: 'ONE MORE DETAIL', description: 'เติมแสงสีพีชให้มุมทำงาน ด้วยป้ายไฟประจำห้อง', anchor: [.75, 2.25, -1.87] },
  desk: { name: 'โต๊ะทำงาน', english: 'Make room for a thought', icon: 'edit', tag: 'YOUR SCRATCHPAD', description: 'จดสิ่งที่กำลังคิด โน้ตจะอยู่ในเบราว์เซอร์เครื่องนี้เมื่อกลับมา', anchor: [.42, .82, -.99] },
};
export const HOTSPOTS = ['monitors', 'lamp', 'chair', 'rug', 'door', 'books'];
export const BOOKS = [
  { id: 'three', name: 'A world in Three.js', label: 'คู่มือสร้างโลกสามมิติ', url: 'https://threejs.org/manual/' },
  { id: 'vite', name: 'Build with Vite', label: 'เริ่มต้นเว็บที่โหลดเร็ว', url: 'https://vite.dev/guide/' },
  { id: 'design', name: 'Design for everyone', label: 'ออกแบบให้ทุกคนใช้งานได้', url: 'https://www.w3.org/WAI/fundamentals/accessibility-intro/' },
];
