/* =====================================================================
   YOUR STORE KEYS - the only file you need to edit to go live.
   Step-by-step instructions are in SETUP.md.
   Leave the quotes empty and the site still works in simple "local mode".
   ===================================================================== */
window.STORE_CONFIG = {

  // 1) Firebase: Project settings -> Your apps -> Web app -> "firebaseConfig"
  //    (these values are safe to be public; your Firestore rules are what protect the data)
  firebase: {
    apiKey: "AIzaSyA3RvmNRr97liyd80Ij_bhaoanLrkZEdkQ",
    authDomain: "my-whatsapp-shop-6ad54.firebaseapp.com",
    projectId: "my-whatsapp-shop-6ad54",
    appId: "1:765467698598:web:3af569d58a8d9193789b67"
  },

  // 2) The email address of your admin account (the same one you create in Firebase Authentication)
  adminEmail: "kafikhan11@gmail.com",

  // 3) Cloudinary (free photo hosting): cloud name + an UNSIGNED upload preset
  cloudinary: {
    cloudName: "d9xxjxvr",
    uploadPreset: "mta7xcx7"
  }
};
