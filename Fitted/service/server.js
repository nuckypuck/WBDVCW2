// Base path for routing
const basePath = '/M00949455';

// Required modules and dependencies
const express = require('express'); // Express framework for handling routes and middleware
const session = require('express-session'); // Middleware for handling session management
const cookieParser = require('cookie-parser'); // Middleware for parsing cookies
const bodyParser = require('body-parser'); // Middleware for parsing request bodies
const mongodb = require('mongodb'); // MongoDB client for database interactions
const multer = require('multer'); // Middleware for handling file uploads
const bcrypt = require('bcrypt'); // Library for password hashing and comparison
const http = require('http'); // Node.js HTTP server
const socketIo = require('socket.io'); // Real-time communication with Socket.IO
const path = require('path'); // Module for handling and working with file paths
const fs = require('fs'); // File system module for handling files
const sharp = require('sharp'); // Image processing library (not used in current code)

// Initialize Express app and server
const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app); // Create HTTP server using Express app
const io = socketIo(server); // Initialize Socket.IO for real-time communication
const mongoURI = 'mongodb://localhost:27017'; // MongoDB connection URI
const client = new mongodb.MongoClient(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

// Start the server and log the URL
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}${basePath}`);
});

// Middleware
app.use(`${basePath}/`, express.static('public')); // Serve static files under /M00949455/
app.use(`${basePath}/uploads`, express.static('uploads')); // Serve uploads under /M00949455/uploads
app.use(bodyParser.json()); // Parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies
app.get('/', (req, res) => {
    res.redirect(basePath);
});
app.use(session({
    secret: 'your_secret_key', // Secret key for session management
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// MongoDB Connection - async function to connect to MongoDB
async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1); // Exit the process if connection fails
    }
}
connectToDatabase();

// Multer Storage Configurations for Profile Picture and Posts
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/profile-pictures/'); // Store profile pictures in 'uploads/profile-pictures' folder
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname); // Get file extension
      const baseName = file.fieldname + '-' + Date.now(); // Create a unique file name
      cb(null, baseName + ext); // Save file with unique name
    },
});

const postStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/posts/'); // Store post images in 'uploads/posts' folder
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname); // Get file extension
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`; // Unique name for post images
        cb(null, uniqueName); // Save with unique name
    },
});

// File upload middleware with filtering for post images
const postUpload = multer({
    storage: postStorage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif']; // Allowed file types
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true); // Accept file
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, JPG, and GIF are allowed.'));
        }
    },
});

const upload = multer({ storage }); // General upload middleware

// Middleware to check if user is authenticated (requires login)
function requireLogin(req, res, next) {
    if (req.session && req.session.user) {
        return next(); // Proceed to the next middleware or route if authenticated
    } else {
        return res.status(401).json({ message: 'Unauthorized' }); // Return 401 Unauthorized if not authenticated
    }
}

// Middleware to prevent multiple logins
function preventMultipleLogins(req, res, next) {
    if (req.session && req.session.user) {
      return res.status(403).json({ message: 'You are already logged in. Please log out first.' });
    }
    next(); // Proceed to the next middleware or route if not logged in
}

// Set up Socket.IO event handlers
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id); // Log when a user connects

    socket.emit('message', 'Welcome to the Socket.IO server!'); // Emit a welcome message to the client

    socket.on('customEvent', (data) => { // Handle custom events from the client
        console.log('Received customEvent:', data);
    });

    socket.on('disconnect', () => { // Handle disconnection
        console.log('A user disconnected:', socket.id);
    });
});

// Routes for user registration and login

app.get(`${basePath}/weather`, async (req, res) => {
    const { latitude, longitude } = req.query;

    // Check for missing latitude or longitude
    if (!latitude || !longitude) {
        return res.status(400).json({ message: 'Latitude and Longitude are required' });
    }

    try {
        // Build the Open-Meteo API URL
        const weatherApiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;

        // Fetch weather data from the Open-Meteo API
        const response = await fetch(weatherApiUrl);

        // Handle non-200 HTTP status codes
        if (!response.ok) {
            return res.status(500).json({ message: 'Failed to fetch weather data from Open-Meteo' });
        }

        const weatherData = await response.json();

        // Ensure the response contains expected data
        if (!weatherData || !weatherData.current_weather) {
            return res.status(500).json({ message: 'Invalid weather data received from Open-Meteo' });
        }

        // Return the weather data to the frontend
        res.json(weatherData);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        res.status(500).json({ message: 'Internal server error while fetching weather data' });
    }
});



// User Registration Route
app.post(`${basePath}/users`, async (req, res) => {
    try {
      const { username, email, password, repassword, age } = req.body;
      let errors = [];
  
      // Basic validation checks
      if (!username || username.trim() === '') errors.push('Missing Username');
      if (username && username.length > 20) errors.push('Username must be 20 characters or less');
  
      if (!email || email.trim() === '') errors.push('Missing Email');
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailPattern.test(email)) errors.push('Invalid Email Format');
  
      if (!password || password.trim() === '') errors.push('Missing Password');
      if (password) {
        if (password.length < 8) errors.push('Password must be at least 8 characters');
        if (password.length > 20) errors.push('Password must be at most 20 characters');
        if (!/[a-zA-Z]/.test(password)) errors.push('Password must contain at least one letter');
        if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
        if (!/[!@#$%^&*]/.test(password)) errors.push('Password must contain at least one special character');
      }
  
      if (password !== repassword) errors.push('Passwords do not match');
  
      const agePattern = /^[1-9][0-9]?$/;
      if (!age || !agePattern.test(age) || age < 18 || age > 99) {
        errors.push('Age must be a number between 18 and 99');
      }
  
      // Check for existing user
      const db = client.db('Fitted');
      const collection = db.collection('Users');
      const existingUser = await collection.findOne({
        $or: [{ email: email }, { username: username }],
      });
  
      if (existingUser) {
        errors.push('Account already exists');
      }
  
      // If there are validation errors, return them
      if (errors.length > 0) {
        return res.status(400).json({ message: errors.join(', ') });
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Insert the user into the database
      const user = {
        username,
        email,
        password: hashedPassword,
        age: parseInt(age, 10),
        followers: [],
        following: [],
      };
  
      await collection.insertOne(user);
  
      // Respond with success
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error('Error during registration:', error);
      res.status(500).json({ message: 'Server error occurred during registration' });
    }
  });

// User Login Route
app.post(`${basePath}/login`, preventMultipleLogins, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and Password are required' });
        }

        const db = client.db('Fitted');
        const collection = db.collection('Users');

        const user = await collection.findOne({ username: username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        req.session.user = { username: user.username };

        // Include the profile picture in the login response
        return res.status(200).json({
            message: 'Login successful',
            username: user.username,
            profilePicture: user.profilePicture || `${basePath}/uploads/profile-pictures/default-profile.png`, // Default if not set
        });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ message: 'Server error occurred during login' });
    }
});

// User Logout Route
app.delete(`${basePath}/login`, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: "Failed to log out" });
        }
        res.clearCookie('connect.sid');  // Clear the session cookie
        res.status(200).json({ message: "Logged out successfully" });
    });
});

// Check if the user is logged in
app.get(`${basePath}/login`, (req, res) => {
    if (req.session && req.session.user) {
        const db = client.db('Fitted');
        const usersCollection = db.collection('Users');

        usersCollection.findOne({ username: req.session.user.username })
            .then(user => {
                if (user) {
                    res.json({
                        loggedIn: true,
                        username: user.username,
                        profilePicture: user.profilePicture || `${basePath}/uploads/profile-pictures/default-profile.png`, // Default if not set
                    });
                } else {
                    res.json({ loggedIn: false });
                }
            })
            .catch(error => {
                console.error('Error checking login status:', error);
                res.status(500).json({ message: 'Server error occurred during login check' });
            });
    } else {
        res.json({ loggedIn: false });
    }
});

// Refresh route to get the count of posts and following
app.get(`${basePath}/refresh`, requireLogin, async (req, res) => {
    try {
        const { username } = req.query; // Get the username from the request query parameters
        await client.connect();
        const db = client.db('Fitted');

        // Fetch following count from the 'Following' collection
        const followingCollection = db.collection('Following');
        const followingUser = await followingCollection.findOne({ username: username });
        const followingCount = followingUser ? followingUser.following.length : 0;

        // Fetch posts count for the specified user from the 'Posts' collection
        const postsCollection = db.collection('Posts');
        const userPostsCount = await postsCollection.countDocuments({ username: username });

        res.json({ following: followingCount, posts: userPostsCount }); // Return the counts as a JSON response
    } catch (err) {
        console.error(err); // Log any errors
        res.status(500).json({ error: 'Internal server error' }); // Return an error if something fails
    }
});

// Route to get a user's profile details
app.get(`${basePath}/profile/:username`, async (req, res) => {
    const { username } = req.params; // Extract username from route parameters

    try {
        const db = client.db('Fitted');
        const usersCollection = db.collection('Users');
        const postsCollection = db.collection('Posts');

        // Fetch user profile details from the 'Users' collection
        const user = await usersCollection.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' }); // Handle case where user doesn't exist
        }

        // Fetch the posts by this user from the 'Posts' collection
        const posts = await postsCollection.find({ username }).toArray();

        // Prepare profile data including post count, followers, and profile picture
        const profileData = {
            username: user.username,
            postCount: posts.length,
            followers: user.followers || [],
            following: user.following || [],
            profilePicture: user.profilePicture || `${basePath}/uploads/profile-pictures/default-profile.png`, // Default profile picture if none exists
        };

        // Check if the logged-in user is following the profile owner
        const isFollowing = req.session?.user
            ? user.followers.includes(req.session.user.username)
            : false;

        res.json({ success: true, profile: profileData, isFollowing }); // Return profile data and following status
    } catch (error) {
        console.error('Error fetching profile:', error); // Log any errors
        res.status(500).json({ message: 'Error fetching profile' }); // Return an error if fetching profile fails
    }
});

// Endpoint to retrieve a profile picture
app.get(`${basePath}/getProfilePicture`, requireLogin, async (req, res) => {
    try {
      const username = req.session.user.username; // Get the logged-in user's username
      const db = client.db('Fitted');
      const usersCollection = db.collection('Users');
  
      const user = await usersCollection.findOne({ username }); // Fetch the user from the database
      if (user && user.profilePicture) {
        res.sendFile(path.join(__dirname, user.profilePicture.replace(basePath, '')));
      } else {
        res.sendFile(path.join(__dirname, `${basePath}/uploads/profile-pictures/default-profile.png`));
      }      
    } catch (error) {
      console.error('Error fetching profile picture:', error); // Log any errors
      res.status(500).json({ message: 'Failed to fetch profile picture' }); // Return an error if fetching the profile picture fails
    }
  });

// Endpoint to get posts by the logged-in user
app.get(`${basePath}/posts`, requireLogin, async (req, res) => {
    try {
        const db = client.db('Fitted');
        const postsCollection = db.collection('Posts');

        const loggedInUsername = req.session.user.username; // Get the logged-in user's username
        const userPosts = await postsCollection.find({ username: loggedInUsername }).toArray(); // Fetch posts by this user

        res.json({ posts: userPosts }); // Return the posts as a JSON response
    } catch (error) {
        console.error('Error fetching posts:', error); // Log any errors
        res.status(500).json({ message: 'Failed to fetch posts' }); // Return an error if fetching posts fails
    }
});

// Route to get posts from followed users (without pagination)
app.get(`${basePath}/contents`, async (req, res) => {
    try {
        const db = client.db('Fitted');
        const usersCollection = db.collection('Users');
        const postsCollection = db.collection('Posts');
        
        // Get the logged-in user's username
        const loggedInUsername = req.session.user.username;

        // Fetch the list of followed users
        const user = await usersCollection.findOne({ username: loggedInUsername });
        const following = user.following || [];

        // If the user isn't following anyone, return an empty array
        if (following.length === 0) {
            return res.json({
                posts: [],
                totalPages: 0,
                currentPage: 1,
            });
        }

        // Fetch all posts from the followed users (no pagination)
        const posts = await postsCollection.find({ username: { $in: following } }).toArray();

        // Return all posts in the following feed
        res.json({
            posts,
            totalPages: 1,  // Since there is no pagination, just return 1 page
            currentPage: 1,
        });
    } catch (error) {
        console.error('Error fetching following posts:', error); // Log any errors
        res.status(500).json({ message: 'Failed to fetch following posts' }); // Return an error if fetching following posts fails
    }
});

// Endpoint for uploading a profile picture
app.post(`${basePath}/uploadPhoto`, upload.single('image'), requireLogin, async (req, res) => {
    try {
      const username = req.session.user.username; // Get the logged-in user's username
      const db = client.db('Fitted');
      const usersCollection = db.collection('Users');
  
      // Ensure a file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
  
      // Construct the relative file path for the new profile picture
      const newImagePath = `${basePath}/uploads/profile-pictures/${req.file.filename}`;
  
      // Fetch the user from the database
      const user = await usersCollection.findOne({ username });
  
      // Delete the old profile picture if it exists (and isn't the default image)
      if (user && user.profilePicture && user.profilePicture !== 'default-profile.png') {
        const oldImagePath = path.join(__dirname, user.profilePicture);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath); // Delete the old profile picture
        }
      }
  
      // Update the user's profile picture in the database
      await usersCollection.updateOne(
        { username },
        { $set: { profilePicture: newImagePath } }
      );
  
      res.status(200).json({ imageUrl: newImagePath }); // Return the new image URL
    } catch (error) {
      console.error('Error uploading profile picture:', error); // Log any errors
      res.status(500).json({ message: 'Failed to upload profile picture' }); // Return an error if uploading the profile picture fails
    }
  });



// Serve post images
app.get(`${basePath}/uploads/posts/:filename`, (req, res) => {
    const filename = req.params.filename; // Extract the filename from the request parameters
    const filePath = path.join(__dirname, 'uploads/posts', filename); // Construct the file path

    // Check if the file exists and serve it
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath); // Serve the file
    } else {
        res.status(404).json({ message: 'Image not found' }); // Return a 404 error if file is missing
    }
});

// Combined endpoint to upload a post with or without an image
app.post(`${basePath}/contents`, requireLogin, postUpload.single('image'), async (req, res) => {
    try {
        const { content, imageURL: bodyImageURL } = req.body; // Get post content and optional imageURL from the request body
        const username = req.session.user.username; // Get the logged-in user's username
        const date = new Date().toISOString().slice(0, 10); // Get the current date in YYYY-MM-DD format

        let imageURL = bodyImageURL || null; // Use body imageURL if provided, else null

        // Check if an image file is uploaded
        if (req.file) {
            const originalPath = req.file.path; // Path of the uploaded image
            const resizedPath = `uploads/posts/resized-${Date.now()}.jpg`; // Path for resized image

            // Resize the image using sharp and save as JPEG
            await sharp(originalPath)
                .resize(500, 500)
                .toFormat('jpeg')
                .toFile(resizedPath);

            // Update the imageURL with the resized image path
            imageURL = `${basePath}/uploads/posts/${path.basename(resizedPath)}`;

            // Delete the original uploaded image
            fs.unlink(originalPath, (err) => {
                if (err) {
                    console.error(`Failed to delete original file: ${originalPath}`, err);
                }
            });
        }

        const db = client.db('Fitted');
        const postsCollection = db.collection('Posts');

        // Insert the post into the database
        await postsCollection.insertOne({ username, content, date, imageURL });

        // Respond with success and the image URL (if available)
        res.status(201).json({ message: 'Post uploaded successfully', imageURL });
    } catch (error) {
        console.error('Error uploading post:', error); // Log any errors
        res.status(500).json({ message: 'Failed to upload post' }); // Return an error if upload fails
    }
});

// Route to fetch posts with pagination
app.get(`${basePath}/allshow`, async (req, res) => {
    try {
        const db = client.db('Fitted');
        const postsCollection = db.collection('Posts');
        
        const page = parseInt(req.query.page) || 1;  // Default to page 1 if no page is specified
        const limit = 10;  // Limit the number of posts per page
        const skip = (page - 1) * limit;  // Calculate how many posts to skip based on the current page

        // Fetch posts with pagination
        const posts = await postsCollection.find({}).skip(skip).limit(limit).toArray();
        const totalPosts = await postsCollection.countDocuments(); // Get total number of posts

        const totalPages = Math.ceil(totalPosts / limit); // Calculate total number of pages

        res.json({
            posts, // Return the posts for the current page
            totalPages, // Return the total number of pages
            currentPage: page, // Return the current page number
        });
    } catch (error) {
        console.error('Error fetching posts:', error); // Log any errors
        res.status(500).json({ message: 'Failed to fetch posts' }); // Return an error if fetching posts fails
    }
});

// Route to follow/unfollow a user
app.post(`${basePath}/follow/:username`, requireLogin, async (req, res) => {
    const { username } = req.params; // Get the target username from the route parameters
    const loggedInUsername = req.session.user.username; // Get the logged-in user's username

    try {
        const db = client.db('Fitted');
        const usersCollection = db.collection('Users');

        // Fetch the target user's details
        const targetUser = await usersCollection.findOne({ username });
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' }); // If target user is not found, return 404
        }

        // Fetch the logged-in user's details
        const loggedInUser = await usersCollection.findOne({ username: loggedInUsername });
        const isFollowing = loggedInUser.following.includes(username); // Check if the logged-in user is following the target user

        if (isFollowing) {
            // Unfollow the target user
            await usersCollection.updateOne(
                { username: loggedInUsername },
                { $pull: { following: username } } // Remove from logged-in user's following list
            );
            await usersCollection.updateOne(
                { username },
                { $pull: { followers: loggedInUsername } } // Remove from target user's followers list
            );
        } else {
            // Follow the target user
            await usersCollection.updateOne(
                { username: loggedInUsername },
                { $push: { following: username } } // Add to logged-in user's following list
            );
            await usersCollection.updateOne(
                { username },
                { $push: { followers: loggedInUsername } } // Add to target user's followers list
            );
        }

        // Fetch updated user data
        const updatedTargetUser = await usersCollection.findOne({ username });
        const updatedLoggedInUser = await usersCollection.findOne({ username: loggedInUsername });

        // Check if the two users are mutual followers (friends)
        const isFriends =
            updatedTargetUser.followers.includes(loggedInUsername) &&
            updatedTargetUser.following.includes(loggedInUsername) &&
            updatedLoggedInUser.followers.includes(username) &&
            updatedLoggedInUser.following.includes(username);

        res.json({
            success: true,
            isFollowing: !isFollowing, // Return the new follow status (inverse of previous)
            isFriends, // Return mutual friend status
            updatedFollowersCount: updatedTargetUser.followers.length, // Updated follower count
            updatedFollowingCount: updatedLoggedInUser.following.length, // Updated following count
        });
    } catch (error) {
        console.error('Error updating follow status:', error); // Log any errors
        res.status(500).json({ message: 'Error updating follow status' }); // Return server error if something goes wrong
    }
});

// Route to get the current date
app.get(`${basePath}/currentDate`, (req, res) => {
    const currentDate = getCurrentDate(); // Call helper function to get the current date
    res.json({ currentDate }); // Return the current date as a JSON response
});

app.get(`${basePath}/users/search`, async (req, res) => {
    try {
        const { q } = req.query; // Get the search keyword from query parameters

        if (!q) {
            return res.status(400).json({ message: 'Search keyword is required' }); // Return error if keyword is not provided
        }

        const db = client.db('Fitted');
        const usersCollection = db.collection('Users');

        // Search for users with matching usernames (case-insensitive)
        const users = await usersCollection
            .find({ username: { $regex: q, $options: 'i' } }) // Match usernames partially
            .toArray();

        res.json({ users }); // Return the search results with users
    } catch (error) {
        console.error('Error searching users:', error); // Log any errors
        res.status(500).json({ message: 'Failed to search users' }); // Return an error if search fails
    }
});

app.get(`${basePath}/contents/search`, async (req, res) => {
    try {
        const { q } = req.query; // Note the change to 'q' to match your query parameter
        const pageSize = 10; // Set the page size for pagination

        // Debugging: Log the incoming query parameter
        console.log(`[DEBUG] Search keyword received: ${q}`);

        if (!q) {
            console.log(`[DEBUG] No search keyword provided.`);
            return res.status(400).json({ message: 'Search keyword is required' }); // Return error if keyword is not provided
        }

        const db = client.db('Fitted');
        const postsCollection = db.collection('Posts');

        // Debugging: Log the search query being executed
        console.log(`[DEBUG] Executing search query: { content: { $regex: ${q}, $options: 'i' } }`);

        // Search for posts containing the keyword in their content (case-insensitive)
        const posts = await postsCollection
            .find({ content: { $regex: q, $options: 'i' } }) // Search using the 'q' parameter
            .toArray();

        // Debugging: Log the raw posts found
        console.log(`[DEBUG] Posts found: ${JSON.stringify(posts, null, 2)}`);

        // Add the page number for each post based on its position in the collection
        const postsWithPage = await Promise.all(
            posts.map(async (post, index) => {
                const totalPosts = await postsCollection.countDocuments();
                const postIndex = await postsCollection
                    .find({})
                    .sort({ _id: 1 }) // Sort by ascending `_id` (default order)
                    .map(p => p._id.toString())
                    .toArray()
                    .then(postIds => postIds.indexOf(post._id.toString())); // Get the position of the post

                const page = Math.floor(postIndex / pageSize) + 1; // Calculate the page number
                return { ...post, page }; // Add the page number to the post
            })
        );

        // Debugging: Log the posts with pagination
        console.log(`[DEBUG] Posts with pagination: ${JSON.stringify(postsWithPage, null, 2)}`);

        res.json({ posts: postsWithPage }); // Return the posts with pagination
    } catch (error) {
        console.error('[ERROR] Searching posts failed:', error); // Log any errors
        res.status(500).json({ message: 'Failed to search posts' }); // Return an error if search fails
    }
});


// Error handling middleware to catch unhandled errors
app.use((err, req, res, next) => {
    console.error('Error:', err); // Log the error
    res.status(500).json({ message: 'Internal server error' }); // Return a generic server error message
});


