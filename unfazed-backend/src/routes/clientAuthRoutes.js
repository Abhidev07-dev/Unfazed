
const express = require("express");
const router = express.Router();

const {
  registerClientAccount,
  loginClient
} = require("../controllers/clientAuthController");

router.post("/register", registerClientAccount);
router.post("/login", loginClient);

module.exports = router;
