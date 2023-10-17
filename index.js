const express = require("express");
var app = express();
const ejs = require("ejs");
const parser = require("body-parser");
var passwordHash = require("password-hash"); //for generating the hashing password
const swal = require("sweetalert2");//for alerts
app.set("view engine", "ejs"); //ejs view engine setup
app.use(parser.urlencoded({ extended: true }));
//for database
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
var serviceAccount = require("./key.json");
initializeApp({
  credential: cert(serviceAccount),
});
const db = getFirestore();
// const notifier = require("node-notifier"); //for notifying them
// const alert = require("alert");
//for giving unique id to user and the user cannot open dashboard without login
var session = require("express-session");
const { v4: uuidv4 } = require("uuid");
// Generate a random UUID for session 1
const session1Id = uuidv4();

// Generate a different random UUID for session 2
const session2Id = uuidv4();

// Configure session 1
const sessionConfig1 = {
  secret: session1Id, // Use the first UUID
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 } // Example: set the session timeout to 1 hour
};

// Configure session 2
const sessionConfig2 = {
  secret: session2Id, // Use the second UUID
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 7200000 } // Example: set the session timeout to 2 hours
};

app.use(session(sessionConfig1));
app.use('/adminlogin', session(sessionConfig2));
// app.use(
//   session({
//     secret: uuidv4(),
//     resave: false,
//     saveUninitialized: true,
//   })
// );
//sample route
app.get("/", (req, res) => {
  res.render("homepage.ejs");
});
//signup route for users
app.get("/signup", function(req, res) {
  res.render("signuppage.ejs");
});

app.post("/signupsubmit", function(req, res) {
  db.collection("usercDetails")
    .where("Email", "==", req.body.email)
    .get()
    .then((docs) => {
      if (docs.size > 0) {
        res.render("signuppage", { register: " email already registered" });
      } else {
        var hashedPassword = passwordHash.generate(req.body.password);
        console.log(hashedPassword);
        db.collection("usercDetails")
          .add({
            Fullname: req.body.fullname,
            Email: req.body.email,
            password: hashedPassword,
          })
          .then(() => {
            res.redirect("/login");
          });
      }
    });
});

//login route for user

app.get("/login", function(req, res) {
  res.render("loginpage.ejs");
});

app.post("/loginsubmit", function(req, res) {
  db.collection("usercDetails")
    .where("Email", "==", req.body.email)
    .get()
    .then((docs) => {
      var verified = false;
      docs.forEach((doc) => {
        verified = passwordHash.verify(req.body.password, doc.data().password);
        //console.log(req.body.password);
        //console.log(verified);
      });
      if (verified) {
        req.session.user = req.body.email;
        res.redirect("/user/dashboard");
      } else {
        res.send("please enter the valid ceredentials");
      }
    });
});

//signup route for admin
app.get("/adminsignup", function(req, res) {
  res.render("supervisiorsignup.ejs");
});

app.post("/adminsignupsubmit", function(req, res) {
  db.collection("adminDetails")
    .where("Email", "==", req.body.email)
    .get()
    .then((docs) => {
      if (docs.size > 0) {
        res.render("supervisiorsignuppage", {
          register: " email already registered",
        });
      } else {
        var hashedPassword = passwordHash.generate(req.body.password);
        console.log(hashedPassword);
        db.collection("adminDetails")
          .add({
            Fullname: req.body.fullname,
            Email: req.body.email,
            password: hashedPassword,
          })
          .then(() => {
            res.redirect("/adminlogin");
          });
      }
    });
});

//login route for admin
app.get("/adminlogin", function(req, res) {
  res.render("supervisiorlogin.ejs");
});

app.post("/adminloginsubmit", function(req, res) {
  db.collection("adminDetails")
    .where("Email", "==", req.body.email)
    .get()
    .then((docs) => {
      var verified = false;
      docs.forEach((doc) => {
        verified = passwordHash.verify(req.body.password, doc.data().password);
        //console.log(req.body.password);
        //console.log(verified);
      });
      if (verified) {
        req.session.user2 = req.body.email;
        res.redirect("/admin/dashboard");
      } else {
        res.send("please enter the valid ceredentials");
      }
    });
});

//user complaint page where the user sends the complaint and the details are uploaded to the firestore
app.get("/userComplaint", (req, res) => {
  if (req.session.user) {
    res.render("user_complaintreg.ejs", { name: req.session.user });
  }
});
const generateComplaintNumber = require("./userComplaintCounters"); //for creating a series numbers of complaints for each user

app.post("/check", (req, res) => {
  const usernamec = req.body.usernamec;
  const rollNum = req.body.rollNum;
  const institution_name = req.body.institution_name;
  const area = req.body.area;
  const complaint = req.body.complaint_name;
  const explanation = req.body.explain;
  const userComplaint = generateComplaintNumber(req.session.user);
  console.log(userComplaint);
  console.log(req.session.user);
  // const currentDateAndTime = new Date();
  // const formattedDateAndTime = currentDateAndTime.toLocaleString();
  const date = new Date();
  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata", // Indian Standard Time (IST)
  };
  const formattedDateAndTime = date.toLocaleString("en-IN", options);
  console.log(formattedDateAndTime);
  // console.log(usernamec);
  // console.log(rollNum);
  // console.log(institution_name);
  // console.log(area);
  // console.log(complaint);
  db.collection("userComplaintinfo")
    .add({
      userID: req.session.user,
      username: usernamec,
      complaintNum: userComplaint,
      rollNo: rollNum,
      INtName: institution_name,
      area: area,
      complaint: complaint,
      explain: explanation,
      creationTime: formattedDateAndTime,
      status: "open",
    })
    .then(() => {
      res.render("user_complaintreg.ejs", {
        name: req.session.user,
        popup: true,
        success: "your complaint is registered successfully",
      });
      // Swal.fire({
      //   title: 'Hello!',
      //   text: 'This is a SweetAlert example.',
      //   icon: 'success',
      // });
      // alert("your complaint is registered successfully");
      // notifier.notify({
      //                       title: 'complaint registered',
      //                       message: "your complaint is successfully registered",
      //                       sound: true,
      //                       wait: true
      //                   });
      // res.send("your complaint is successfully registered");
    });
});
//upto this toatal working
app.get("/complaintHistory", async (req, res) => {
  try {
    const snapshot = await db
      .collection("userComplaintinfo")
      .where("userID", "==", req.session.user)
      .get();
    const complaintHistory = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      complaintHistory.push(data);
    });
    complaintHistory.sort((a, b) => a.complaintNum - b.complaintNum);
    res.render("userComplaintHistory.ejs", {
      complaintHistory,
      name: req.session.user,
    });
  } catch (error) {
    console.error("error fetching data from firestore:", error);
  }
});
//upto this no errors
//displaying all the complaints in admin dashboard
app.get("/adminComplaints", (req, res) => {
  // Fetch all complaints from Firestore
  db.collection("userComplaintinfo")
    .where("status", "!=", "completed")
    .orderBy("status")
    .orderBy("creationTime", "asc")
    .get()
    .then((querySnapshot) => {
      const complaints = [];
      querySnapshot.forEach((doc) => {
        const complaintData = doc.data();
        //we have to add id to the array
        complaints.push({
          id: doc.id,
          username: complaintData.username,
          rollNo: complaintData.rollno,
          INtName: complaintData.INtName,
          area: complaintData.area,
          complaint: complaintData.complaint,
          explain: complaintData.explain,
          creationTime: complaintData.creationTime,
          status: complaintData.status,
        });
      });
      res.render("admin_viewcomplaints.ejs", {
        complaints,
        adminName: req.session.user2,
      }); // Render admin_dashboard.ejs with data
    })
    .catch((error) => {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching complaints" });
    });
});

app.post("/admin/update-status/:complaintId", (req, res) => {
  const complaintId = req.params.complaintId;
  const newStatus = req.query.status;
  console.log(newStatus);

  // Check if the newStatus is valid (e.g., "open" or "completed")
  if (newStatus !== "process" && newStatus !== "completed") {
    return res.status(400).json({ error: "Invalid status" });
  }

  // Declaring another list for updated complaints
  const updatedComplaints = [];

  // Update the status of the complaint in Firestore
  db.collection("userComplaintinfo")
    .doc(complaintId)
    .update({ status: newStatus })
    .then(() => {
      // Fetch updated complaints
      return db
        .collection("userComplaintinfo")
        .where("status", "!=", "completed")
        .orderBy("status")
        .orderBy("creationTime", "asc")
        .get()
        .then((querySnapshot) => {
          querySnapshot.forEach((doc) => {
            const complaintData = doc.data();
            // Add complaint details to the array
            updatedComplaints.push({
              id: doc.id,
              username: complaintData.username,
              rollNo: complaintData.rollno,
              INtName: complaintData.INtName,
              area: complaintData.area,
              complaint: complaintData.complaint,
              explain: complaintData.explain,
              creationTime: complaintData.creationTime,
              status: complaintData.status,
            });
          });
        })
        .then(() => {
          // console.log(updatedComplaints);
          res.render("admin_viewcomplaints.ejs", {
            complaints: updatedComplaints,
            adminName: req.session.user2,
          }); // Render admin_dashboard.ejs with updated data
        })
        .catch((error) => {
          console.error(error);
          res
            .status(500)
            .json({ error: "An error occurred while updating the status" });
        });
    })
    .catch((error) => {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while updating the status" });
    });
});
//this page is for viewing completed complaints in admin page
app.get("/admin/completed-complaints", (req, res) => {
  db.collection("userComplaintinfo")
    .where("status", "==", "completed")
    .orderBy("status")
    .orderBy("creationTime", "asc")
    .get()
    .then((querySnapshot) => {
      const completedComplaints = [];
      querySnapshot.forEach((doc) => {
        const complaintData = doc.data();
        completedComplaints.push({
          username: complaintData.username,
          INtName: complaintData.INtName,
          area: complaintData.area,
          complaint: complaintData.complaint,
          explain: complaintData.explain,
          creationTime: complaintData.creationTime,
          status: complaintData.status,
        });
      });
      res.render("admin_completed.ejs", {
        completedComplaints,
        adminName: req.session.user2,
      });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        error: "An error occurred while fetching  completed complaints",
      });
    });
});

// Function to count complaints based on status
async function countComplaintsByStatus(status) {
  try {
    const querySnapshot = await db
      .collection("userComplaintinfo")
      .where("status", "==", status)
      .get();
    return querySnapshot.size; // Return the count
  } catch (error) {
    console.error(`Error counting ${status} complaints:`, error);
    return 0; // Return 0 in case of an error
  }
}

app.get("/admin/dashboard", async (req, res) => {
  if (req.session.user2) {
    let totalComplaints = 0;
    let processComplaints = 0;
    let openComplaints = 0;
    let completedComplaints = 0;

    try {
      const totalQuerySnapshot = await db.collection("userComplaintinfo").get();
      totalComplaints = totalQuerySnapshot.size;

      openComplaints = await countComplaintsByStatus("open");
      processComplaints = await countComplaintsByStatus("process");
      completedComplaints = await countComplaintsByStatus("completed");

      console.log("Total Complaints:", totalComplaints);
      console.log("Process Complaints:", processComplaints);
      console.log("Completed Complaints:", completedComplaints);
      console.log("openComplaints:", openComplaints);
      res.render("admin_dashboard_fin.ejs", {
        total: totalComplaints,
        process: processComplaints,
        completed: completedComplaints,
        openComplaints,
        adminName: req.session.user2,
      });
    } catch (error) {
      console.error("Error fetching complaints:", error);
      res.status(500).send("Error fetching complaints");
    }
  }
});

async function countComplaintsByStatusUser(status, user) {
  try {
    const querySnapshot = await db
      .collection("userComplaintinfo")
      .where("userID", "==", user)
      .where("status", "==", status)
      .get();
    return querySnapshot.size; // Return the count
  } catch (error) {
    console.error(`Error counting ${status} complaints:`, error);
    return 0; // Return 0 in case of an error
  }
}

//for counting the complaints in users
app.get("/user/dashboard", async (req, res) => {
  if (req.session.user) {
    let totalComplaints = 0;
    let processComplaints = 0;
    let openComplaints = 0;
    let completedComplaints = 0;

    try {
      const totalQuerySnapshot = await db
        .collection("userComplaintinfo")
        .where("userID", "==", req.session.user)
        .get();
      totalComplaints = totalQuerySnapshot.size;

      openComplaints = await countComplaintsByStatusUser(
        "open",
        req.session.user
      );
      processComplaints = await countComplaintsByStatusUser(
        "process",
        req.session.user
      );
      completedComplaints = await countComplaintsByStatusUser(
        "completed",
        req.session.user
      );

      console.log("Total Complaints:", totalComplaints);
      console.log("Process Complaints:", processComplaints);
      console.log("Completed Complaints:", completedComplaints);
      console.log("openComplaints:", openComplaints);
      res.render("user_dashboard.ejs", {
        total: totalComplaints,
        process: processComplaints,
        completed: completedComplaints,
        openComplaints,
        name: req.session.user,
      });
    } catch (error) {
      console.error("Error fetching complaints:", error);
      res.status(500).send("Error fetching complaints");
    }
  }
});
//for user logout
app.get("/logout", (req, res) => {
  req.session.destroy(function(err) {
    if (err) {
      console.log(err);
      res.send(err);
    } else {
      res.render("loginpage", { logout: "logout Successful" });
    }
  });
});
//for logout the admin
app.get("/admin/logout", (req, res) => {
  req.session.destroy(function(err) {
    if (err) {
      console.log(err);
      res.send(err);
    } else {
      res.render("supervisiorlogin", { logout: "logout Successful" });
    }
  });
});
//for creating a port in the localhost and for running the website
app.listen(3000, () => {
  console.log("Example app listening on port 3000!");
});
