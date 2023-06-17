const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require("stripe")(process.env.PAYMENT_SCKEY)
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());

const corsConfig = {
    origin: '',
    credentials: true,
    methods: ['GET', 'POST', 'PUT','PATCH', 'DELETE']
}
app.use(cors(corsConfig))
app.options("", cors(corsConfig))

app.use(express.json())

//-------------------------JWT------------------------------

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];
  
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
      }
      req.decoded = decoded;
      next();
    })
  }


  //===================================================Admin==================
  const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email }
    const user = await usersCollection.findOne(query);
    if (user?.role !== 'admin') {
      return res.status(403).send({ error: true, message: 'forbidden message' });
    }
    next();
  }
//---------------------------Mongo dB Connect ---------------------------------------

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fndo8yx.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

//------------------------------------- Read data-----------------------------------

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const classCollection = client.db('summerSprotsCamps').collection('classes'); 
        const usersCollection = client.db("summerSprotsCamps").collection("allusers"); 
        const paymentCollection = client.db("summerSprotsCamps").collection("payments");    
        // console.log(classCollection);

        
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      
            res.send({ token })
          })


        app.get('/classes', async (req, res) => {
            const cursor = classCollection.find();
            //console.log(cursor);
            const result = await cursor.toArray();
            res.send(result);
            //console.log(result);
        })

        //----------------------userrole get data-----------------------
        app.get('/userrole', async (req, res) => {
            const cursor = usersCollection.find();
            //console.log(cursor);
            const result = await cursor.toArray();
            res.send(result);
            //console.log(result);
        })
        //----------------------role get data-----------------------
        app.get('/userrole/role', async (req, res) => {
            const cursor = usersCollection.find();
            //console.log(cursor);
            const result = await cursor.toArray();
            res.send(result);
           //console.log(result);
        })

        //-----------------------Add New Class------------------

        app.post('/classes/newClass',async (req, res) => {
    
            const newClass = req.body;
        
              await classCollection.insertOne(newClass)
              .then((result) => {
                console.log('Class created successfully:', result);
                res.status(200).json({ message: 'Class created successfully' });
              })
              .catch((error) => {
                console.error('Error creating class:', error);
                res.status(500).json({ message: 'Error creating class' });
              });
          });
        //-----------------------Add New User Role------------------

        app.post('/userrole/adduser',async (req, res) => {
    
            const newUser = req.body;
        
              await usersCollection.insertOne(newUser)
              .then((result) => {
                console.log('Class created successfully:', result);
                res.status(200).json({ message: 'Class created successfully' });
              })
              .catch((error) => {
                console.error('Error creating class:', error);
                res.status(500).json({ message: 'Error creating class' });
              });
          });
         

        //-------------------------Add Booked student-----------------

        // Handle the POST request to add a booked student
  app.post('/classes',  (req, res) => {
    const { classId, studentName, studentEmail } = req.body;

    //const collection = db.collection('classes');

    classCollection.updateOne(
      { classId },
      {
        $push: {
            classBooked: { studentName, studentEmail },
        },
        $inc: {
            bookedStudentCount: 1,
          },
      },
      (err, result) => {
        if (err) {
          console.error('Error adding student as booked:', err);
          res.status(500).json({ error: 'Error adding student as booked' });
        } else {
          console.log('Student added as booked:', result);
          res.json({ message: 'Student added as booked successfully' });
        }
      }
    );
  });
// ------------------------------Update Class---------------------------

app.patch('/classes/updateClass', (req, res) => {
    const { classId, className, classImage, instructorName, instructorImage, instructorEmail, availableSeats, classPrice } = req.body;
     console.log(req.body);
    const query = { classId: classId };
  

    const updateData = {
        $set: {
          className: className,
          classImage: classImage,
          instructorName: instructorName,
          instructorImage: instructorImage,
          instructorEmail: instructorEmail,
          availableSeats: availableSeats,
          classPrice: classPrice*1
        }
      };

      classCollection.findOneAndUpdate(query, updateData, { returnOriginal: false })
    .then((result) => {
      if (result.value) {
        res.json(result.value); // Return the updated class data
      } else {
        res.status(404).json({ error: 'Class not found' });
      }
    })
    .catch((error) => {
      console.error('Error updating class:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
});
// ------------------------------Update Feedback Details---------------------------

app.patch('/classes/Feedback', (req, res) => {
    const { classId, feedbackDetails } = req.body;
     console.log(req.body);
    const query = { classId: classId };
  

    const updateData = {
        $set: {
            feedbackDetails: feedbackDetails,
         
        }
      };

      classCollection.findOneAndUpdate(query, updateData, { returnOriginal: false })
    .then((result) => {
      if (result.value) {
        res.json(result.value); // Return the updated class data
      } else {
        res.status(404).json({ error: 'Class not found' });
      }
    })
    .catch((error) => {
      console.error('Error updating class:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
});
// ------------------------------Update Approved or Denied---------------------------

app.patch('/classes/status', (req, res) => {
    const { classId, status } = req.body;
     console.log(req.body);
    const query = { classId: classId };
  

    const updateData = {
        $set: {
            status: status,
         
        }
      };

      classCollection.findOneAndUpdate(query, updateData, { returnOriginal: false })
    .then((result) => {
      if (result.value) {
        res.json(result.value); // Return the updated class data
      } else {
        res.status(404).json({ error: 'Class not found' });
      }
    })
    .catch((error) => {
      console.error('Error updating class:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
});
// ------------------------------Update User Role---------------------------

app.patch('/userrole', (req, res) => {
    const { email, role } = req.body;
     console.log(req.body);
    const query = { email: email };
  

    const updateData = {
        $set: {
            role: role,
         
        }
      };

      usersCollection.findOneAndUpdate(query, updateData, { returnOriginal: false })
    .then((result) => {
      if (result.value) {
        res.json(result.value); // Return the updated class data
      } else {
        res.status(404).json({ error: 'Role not found' });
      }
    })
    .catch((error) => {
      console.error('Error updating class:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
});

  

    //-------------------------Add Enrolled student-----------------

    // app.post('/classes/enrolledStudent/', (req, res) => {
    //     const { classId, className, studentName, studentEmail } = req.body;
      
    //     classCollection.updateOne(
    //       { classId },
    //       {
    //         $push: {
    //             enrolledStudents: { studentName, studentEmail },
    //         },
    //         $inc: {
    //             enrolledStudentCount: 1,
    //         },
    //       },
    //       (err, result) => {
    //         if (err) {
    //           console.error('Error adding student as enrolled:', err);
    //           res.status(500).json({ error: 'Error adding student as enrolled' });
    //         } else {
    //           console.log('Student added as enrolled:', result);
    //           res.json({ message: 'Student added as enrolled successfully' });
    //         }
    //       }
    //     );
    //   });
      

        //-------------------------Delete Booked Data------------------------

        app.delete('/classes/:className/bookedStudents/:studentEmail', async (req, res) => {

            
            const { className, studentEmail } = req.params;
          
            try {
                       
              // Delete the booked student from the class
              const result = await classCollection.updateOne(
                { className },
                { $pull: { classBooked: { studentEmail } } }
              );
          
              if (result.modifiedCount === 0) {
                return res.status(404).json({ message: 'Student not found in the class' });
              }
          
              res.sendStatus(200);
             
            } catch (error) {
              console.error('Error deleting student:', error);
              res.sendStatus(500);
            }
          });

     // -------------create payment intent----------------------
    // create payment intent
    app.post('/create-payment-intent', async (req, res) => {
        const { price } = req.body;
        const amount = parseInt(price * 100);
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method_types: ['card']
        });
  
        res.send({
          clientSecret: paymentIntent.client_secret
        })
      })

      // payment related api
    // app.post('/payments', async (req, res) => {
    //     const payment = req.body;
    //     const { email, transactionId, price, enrolledStudentCount, classId, className, studentName, studentEmail } = payment;
    //     const insertResult = await paymentCollection.insertOne(payment);
    //     res.send({ insertResult });
    //   })
        
    app.post('/payments', async (req, res) => {
        const { email, transactionId, price, enrolledStudentCount, classId, className, studentName, studentEmail } = req.body;
      
        try {
          // Insert payment details into the database
          const payment = {
            email,
            transactionId,
            price,
            date: new Date(),
            enrolledStudentCount,
            classId,
            className,
            studentName,
            studentEmail
          };
      
          // Remove booked student from the class
          const removeResult = await classCollection.updateOne(
            { classId },
            { $pull: { classBooked: { studentEmail } }, $inc: { bookedStudentCount: -1 } }
          );
      
          // Update enrolled student count in the class
          const updateResult = await classCollection.updateOne(
            { classId },
            { $push: { enrolledStudents: { studentName, studentEmail } }, $inc: { enrolledStudentCount: 1, availableSeats: -1 } }
          );
      
          const insertResult = await paymentCollection.insertOne(payment);
      
          if (insertResult.insertedCount === 1) {
            console.log('Payment inserted successfully:', payment);
            res.json({ message: 'Payment successful and student enrolled in the class' });
          } else {
            console.error('Error inserting payment:', payment);
            // Return success status even if there was an error inserting payment
            res.sendStatus(200);
          }
        } catch (error) {
          console.error('Error processing payment:', error);
          // Return success status even if there was an error processing payment
          res.sendStatus(200);
        }
      });
      
      //---------------------Payment History------------------------------
      app.get('/PaymentHistory/:email', async (req, res) => {
        const { email } = req.params;
        const cursor = paymentCollection.find({ email: email }).sort({ date: -1 });
        const result = await cursor.toArray();
        res.send(result);
      });
      
        
    
      
      
      



        // Send a ping to confirm a successful connection
//-------------------------------------------------------------------------------
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('Sport Camp Running')
});

app.listen(port, () => {
    console.log(`Sport Camp API is running on port: ${port}`)
})
