/* Variables */

var basePath = '/M00949455';
let lastFetchTime = 0;
const updateInterval = 60 * 1000; // 60 seconds in milliseconds
let cachedWeatherData = null;
let currentPage = 1; // Start on the first page
let currentFeedType = 'all'; // Default feed is "all" posts
let currentSortOrder = 'earliest'; // Default sort order

/* UTILITY */

if (typeof window !== 'undefined') {
  window.onclick = function (event) {
    var modals = document.getElementsByClassName('modal');
    for (var i = 0; i < modals.length; i++) {
      if (event.target == modals[i]) {
        modals[i].style.display = 'none';
      }
    }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const postInput = document.getElementById('blog-content');
  const charCounter = document.getElementById('char-counter'); // Character counter span
  const maxLength = 300;

  // Update the character count
  postInput.addEventListener('input', (event) => {
      const currentLength = event.target.value.length;
      charCounter.textContent = `${currentLength}/${maxLength}`;

      // Disable the "Upload Post" button if the length exceeds 300 characters
      const uploadButton = document.querySelector('button[type="button"]');
      if (currentLength > maxLength) {
          uploadButton.disabled = true; // Disable post submission if limit is exceeded
      } else {
          uploadButton.disabled = false; // Enable it if within limit
      }
  });
});

document.addEventListener('DOMContentLoaded', () => {
    const postInput = document.getElementById('blog-content'); // "Add Post" input field
    const addPostSection = document.getElementById('add-post-section'); // "Add Post" section

    // Global key listener
    document.addEventListener('keydown', (event) => {
        const activeElement = document.activeElement;

        // If typing in input, textarea, or content-editable, don't redirect
        if (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable
        ) {
            return;
        }

        // Redirect typing to the "Add Post" input field
        if (postInput && addPostSection.style.display !== 'none') {
            postInput.focus();
        }
    });

    // Submit post on Enter key
    if (postInput) {
        postInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' || event.keyCode === 13) {
                event.preventDefault(); // Prevent adding a new line
                const postContent = postInput.value.trim();

                if (postContent) {
                    uploadPost(); // Submit the post
                } else {
                    alert('Please write something before submitting!');
                }
            }
        });
    }
});

// Load profile picture on page load
document.addEventListener('DOMContentLoaded', async () => {
  try {
      const response = await fetch(`${basePath}/getProfilePicture`);
      if (response.ok) {
          const data = await response.json();
          const profilePicture = document.getElementById('profile-picture');
          profilePicture.src = data.imageUrl || 'default-profile.png'; // Default if no image
      }
  } catch (error) {
      console.error('Error loading profile picture:', error);
  }
});

// Ensure it's called after login is verified
document.addEventListener('DOMContentLoaded', () => {
  checkLoginStatus(() => {
      const loggedInUsername = sessionStorage.getItem('username'); // Assuming username is stored here
      if (loggedInUsername) {
          fetchAndDisplayProfile(loggedInUsername);
      }
  });
});

// Add click listener for userPostsModal
document.addEventListener('DOMContentLoaded', function () {
  // Ensure that the "See Your Posts" button triggers the modal and fetches the posts immediately
  const seeYourPostsButton = document.querySelector('button[onclick="openModal(\'userPostsModal\')"]');
  if (seeYourPostsButton) {
      seeYourPostsButton.addEventListener('click', function () {
          fetchAndDisplayUserPosts();  // Fetch and display user posts when the modal is opened
      });
  } else {
      console.warn('See Your Posts button not found.');
  }

  // Ensure that the modal is opened when the button is clicked
  const userPostsModal = document.getElementById('userPostsModal');
  if (userPostsModal) {
      userPostsModal.addEventListener('click', function () {
          fetchAndDisplayUserPosts();  // Fetch and display user posts when the modal is opened
      });
  } else {
      console.warn('Element with id "userPostsModal" not found.');
  }

  // Call checkLoginStatus when the page is loaded to handle the initial state
  checkLoginStatus();
});

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const refreshButton = document.getElementById('refresh-button');
    if (refreshButton) {
        refreshButton.addEventListener('click', refreshData);
    }
});
}

document.getElementById('profileButton').addEventListener('click', () => {
  const username = document.getElementById('username-display').textContent;
  fetchAndDisplayProfile(username);
});

// Event listener for "Next" page button
document.getElementById('next-page').addEventListener('click', () => {
  currentPage++;
  fetchAndDisplayPosts();
});

// Event listener for "Previous" page button
document.getElementById('prev-page').addEventListener('click', () => {
  currentPage--;
  fetchAndDisplayPosts();
});

// Load all posts when the "See Your Posts" modal is opened
document.getElementById('userPostsModal').addEventListener('click', () => {
  fetchAndDisplayUserPosts(); // Load all user posts
});

// Initialize weather updates on page load
document.addEventListener('DOMContentLoaded', initializeWeatherUpdates);
// Trigger check on DOM load
document.addEventListener('DOMContentLoaded', checkLoginStatus);
// Call fetchAndDisplayPosts on page load
document.addEventListener('DOMContentLoaded', fetchAndDisplayPosts);
// Ensure this functionality is initialized for logged-in users
document.addEventListener('DOMContentLoaded', attachUsernameClickEvents);

/* Utility Functions */

function openModal(modalId) {
  document.getElementById(modalId).style.display = 'block';
  
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

function formatErrorMessages(errorMessage) {
  // Expecting the error message from the backend to be a comma-separated list of errors
  const errors = errorMessage.split(',').map(msg => `<li>${msg.trim()}</li>`).join('');
  return `<ul>${errors}</ul>`;
}

function showErrorModal(message) {
  const errorModal = document.getElementById('errorModal');
  const errorMessage = document.getElementById('errorMessage');

  if (errorModal && errorMessage) {
    errorMessage.innerHTML = message; // Update the error message as a list
    errorModal.style.display = 'block'; // Show the modal
  } else {
    console.error('Error modal or message element not found.');
  }
}

function updateFileName(input) {
  const fileNameSpan = document.getElementById('file-name'); // Get the span for the file name
  const fileName = input.files[0] ? input.files[0].name : 'No file chosen'; // Check if a file is selected
  fileNameSpan.textContent = fileName; // Update the text in the span
}

// Function to reset the file name (if applicable)
function resetFileName() {
  const fileInput = document.getElementById('photo-upload'); // Get the file input element
  const fileNameSpan = document.getElementById('file-name'); // Get the span for the file name
  fileInput.value = ''; // Clear the file input
  fileNameSpan.textContent = 'No file chosen'; // Reset the file name display
}

function jumpToPost(postId, page) {
  // Update the current page variable
  currentPage = page;

  // Fetch and display the posts for the specified page
  fetchAndDisplayPosts()
    .then(() => {
      // After loading the posts, scroll to the specific post
      scrollToPost(postId);
    })
    .catch(error => {
      console.error('Error navigating to the post:', error);
      alert('Failed to navigate to the post.');
    });
}

function scrollToPost(postId) {
  const targetPost = document.getElementById(postId); // Locate the post by its ID
  if (targetPost) {
    targetPost.scrollIntoView({
      behavior: 'smooth', // Smooth scrolling
      block: 'center',    // Center the post in the viewport
    });

    // Add a flash effect class
    targetPost.classList.add('flash-effect');

    // Remove the flash effect after a short delay (e.g., 1 second)
    setTimeout(() => {
      targetPost.classList.remove('flash-effect');
    }, 1000);

    // Close the search modal
    closeModal('searchPeopleModal');
  } else {
    console.warn(`Post with ID ${postId} not found.`);
  }
}

// Function to scroll to the "Add your Post" section
function scrollToAddPost() {
  const addPostSection = document.getElementById('add-post-section'); // Get the "Add your Post" section
  if (addPostSection) {
      addPostSection.scrollIntoView({ behavior: 'smooth' }); // Scroll to the "Add your Post" section smoothly
  }
}

// Function to scroll to the top of the page
function scrollToTop() {
  window.scrollTo({
    top: 0,  // Scroll to the top of the page
    behavior: 'smooth'  // Smooth scroll effect
  });
}

// Function to scroll to the bottom of the page
function scrollToBottom() {
  window.scrollTo({
    top: document.documentElement.scrollHeight,  // Scroll to the bottom of the page
    behavior: 'smooth'  // Smooth scroll effect
  });
}

function getCurrentDate() {
  // Get current date in YYYY-MM-DD format
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // January is 0
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function displayPosts(posts) {
  const feedContent = document.getElementById('userPostsContent');
  feedContent.innerHTML = ''; // Clear existing posts

  posts.forEach(post => {
    const postElement = document.createElement('div');
    postElement.classList.add('post');

    // Add username
    const usernameElement = document.createElement('div');
    usernameElement.textContent = `@${post.username}`;
    postElement.appendChild(usernameElement);

    // Add post content
    const contentElement = document.createElement('div');
    contentElement.textContent = post.content;
    postElement.appendChild(contentElement);

    // Add image if available
    if (`${basePath}${post.imageURL}`) {
      const imageElement = document.createElement('img');
      imageElement.src = `${basePath}${post.imageURL}`;
      imageElement.alt = 'Post Image';
      postElement.style.maxWidth = '100%'; // Ensure image fits within the post
      postElement.appendChild(imageElement);
    }

    feedContent.appendChild(postElement); // Append the post to the content container
  });
}

function refreshData() {
  const followingSpan = document.getElementById('following-display');
  const postsSpan = document.getElementById('posts-display');
  const usernameSpan = document.getElementById('username-display');

  const loggedInUsername = usernameSpan?.textContent.trim();
  if (!followingSpan || !postsSpan || !loggedInUsername) {
      console.warn('One or more elements not found during refreshData.');
      return; // Exit if elements are missing
  }

  fetch(`${basePath}/refresh?username=${loggedInUsername}`)
      .then(response => response.json())
      .then(data => {
          // Update counts dynamically if elements exist
          followingSpan.textContent = data.following > 0 ? data.following : 0;
          postsSpan.textContent = data.posts > 0 ? data.posts : 0;

          // Optionally fetch and display posts
          fetchAndDisplayPosts();
      })
      .catch(error => console.error('Error refreshing data:', error));
}

// Function to update the sorting and refresh the feed
function updateFeedSorting() {
  const sortingDropdown = document.getElementById('feed-sorting');
  currentSortOrder = sortingDropdown.value; // Update sort order based on selection
  fetchAndDisplayPosts(); // Refresh the feed
}

function switchFeed(feedType) {
  // Check if the user is logged in
  fetch(`${basePath}/login`, {
      method: 'GET',
      credentials: 'include',
  })
  .then(response => response.json())
  .then(data => {
      if (!data.loggedIn && feedType === 'following') {
          // If the user is not logged in and tries to access the "Following" feed, show an alert
          alert('You must log in to view followed user\'s posts');
          return; // Prevent switching to "Following" feed
      }

      // Update the feed type
      currentFeedType = feedType;

      // Update the active class on the tabs
      const tabs = document.querySelectorAll('.tab');
      tabs.forEach(tab => tab.classList.remove('active'));
      document.getElementById(`${feedType}-tab`).classList.add('active');

      // Fetch the appropriate posts
      if (feedType === 'feed') {
          fetchAndDisplayPosts();
      } else if (feedType === 'following') {
          fetchAndDisplayFollowingPosts();
      }
  })
  .catch(error => {
      console.error('Error checking login status:', error);
      alert('An error occurred while checking login status.');
  });
}

function searchAll() {
  const searchInput = document.getElementById('searchPeopleInput').value.trim();
  if (!searchInput) {
      alert('Please enter a search keyword');
      return;
  }

  // Initialize empty results for people and posts
  let peopleResults = [];
  let postResults = [];

  // Call searchPeople and searchPosts
  const searchPeoplePromise = fetch(`${basePath}/users/search?q=${encodeURIComponent(searchInput)}`)
      .then(response => {
          if (!response.ok) {
              throw new Error('Failed to search people');
          }
          return response.json();
      })
      .then(data => {
          peopleResults = data.users; // Store people results
      })
      .catch(error => {
          console.error('Error searching people:', error);
      });

  const searchPostsPromise = fetch(`${basePath}/contents/search?q=${encodeURIComponent(searchInput)}`)
      .then(response => {
          if (!response.ok) {
              throw new Error('Failed to search posts');
          }
          return response.json();
      })
      .then(data => {
          postResults = data.posts; // Store posts results
      })
      .catch(error => {
          console.error('Error searching posts:', error);
      });

  // Wait for both promises to complete and then display the results
  Promise.all([searchPeoplePromise, searchPostsPromise])
      .then(() => {
          displaySearchResults(peopleResults, postResults); // Display combined results
      })
      .catch(error => {
          console.error('Error in combined search:', error);
          alert('Failed to complete search');
      });
}


function searchPeople() {
  const searchInput = document.getElementById('searchPeopleInput').value.trim();
  if (!searchInput) {
    alert('Please enter a search keyword');
    return;
  }

  fetch(`${basePath}/users/search?q=${encodeURIComponent(searchInput)}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to search users');
      }
      return response.json();
    })
    .then(data => {
      displaySearchResults(data.users, []); // Display only users in the results
    })
    .catch(error => {
      console.error('Error searching users:', error);
      alert('Failed to search users');
    });
}

function searchPosts() {
  const searchInput = document.getElementById('searchPostsInput').value.trim();
  if (!searchInput) {
    alert('Please enter a search keyword');
    return;
  }

  fetch(`${basePath}/contents/search?q=${encodeURIComponent(searchInput)}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to search posts');
      }
      return response.json();
    })
    .then(data => {
      if (!data.posts || data.posts.length === 0) {
        alert('No posts found matching your search');
        return;
      }
      displaySearchResults([], data.posts); // Display only posts in the results
    })
    .catch(error => {
      console.error('Error searching posts:', error);
      alert('Failed to search posts');
    });
}


function displaySearchResults(users, posts) {
  const searchResultsContainer = document.getElementById('searchResults');
  searchResultsContainer.innerHTML = ''; // Clear previous results

  // Display matching users
  if (users.length > 0) {
      searchResultsContainer.innerHTML += '<h3>Matching Users:</h3>';
      users.forEach(user => {
          searchResultsContainer.innerHTML += `
              <p>
                  <a href="#" class="username-link" data-username="${user.username}" onclick="openUserProfileModal('${user.username}')">
                      @${user.username}
                  </a>
              </p>`;
      });
      searchResultsContainer.innerHTML += '<hr>'; // Separator between users and posts
  }

  // Display matching posts
  if (posts.length > 0) {
      searchResultsContainer.innerHTML += '<h3>Matching Posts:</h3>';
      posts.forEach(post => {
          searchResultsContainer.innerHTML += `
              <p>
                  <a href="#" class="post-link" onclick="jumpToPost('${post._id}', ${post.page})">
                      @${post.username}: ${post.content}
                  </a>
              </p>`;
      });
  }

  // Display a message if no results found
  if (users.length === 0 && posts.length === 0) {
      searchResultsContainer.innerHTML = '<p>No results found.</p>';
  }
}

function displayWeatherData(data) {
  const weatherContent = document.getElementById('weather-content');

  if (!data || !data.current_weather) {
      weatherContent.innerHTML = '<p>Weather data is unavailable.</p>';
      return;
  }

  const { temperature, windspeed, weathercode } = data.current_weather;

  weatherContent.innerHTML = `
      <h3>Current Weather</h3>
      <p>Temperature: ${temperature}°C</p>
      <p>Wind Speed: ${windspeed} km/h</p>
      <p>Condition Code: ${weathercode}</p>
  `;
}


function fetchWeatherFromBackend(latitude, longitude) {
  const now = Date.now();

  // Use cached data if it exists and is still valid
  if (cachedWeatherData && now - lastFetchTime < updateInterval) {
      console.log('Using cached weather data');
      displayWeatherData(cachedWeatherData);
      return;
  }

  // Fetch fresh weather data from the backend
  fetch(`${basePath}/weather?latitude=${latitude}&longitude=${longitude}`)
      .then((response) => {
          if (!response.ok) {
              throw new Error(`Failed to fetch weather data: ${response.statusText}`);
          }
          return response.json();
      })
      .then((data) => {
          if (!data.current_weather) {
              throw new Error('Weather data is incomplete or missing');
          }
          cachedWeatherData = data; // Cache the data
          lastFetchTime = Date.now(); // Update the fetch timestamp
          displayWeatherData(data); // Display the weather data
      })
      .catch((error) => {
          console.error('Error fetching weather data:', error);
          const weatherContent = document.getElementById('weather-content');
          if (weatherContent) {
              weatherContent.innerHTML = '<p>Failed to load weather data. Please try again later.</p>';
          }
      });
}


function initializeWeatherUpdates() {
  if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
          (position) => {
              const { latitude, longitude } = position.coords;
              fetchWeatherFromBackend(latitude, longitude); // Fetch weather data from backend
          },
          (error) => {
              console.error('Geolocation error:', error);
              fetchFallbackWeatherFromBackend(); // Fallback to a default location
          },
          { timeout: 10000 } // Optional timeout for geolocation
      );
  } else {
      console.warn('Geolocation not supported. Using fallback location.');
      fetchFallbackWeatherFromBackend(); // Fallback to a default location
  }
}

function fetchFallbackWeatherFromBackend() {
  const defaultLatitude = 51.5074; // London Latitude
  const defaultLongitude = -0.1278; // London Longitude
  fetchWeatherFromBackend(defaultLatitude, defaultLongitude);
}



function handleSuccessfulLogin(username) {
  const usernameSpan = document.getElementById('username-display');
  if (usernameSpan) {
      usernameSpan.textContent = username;
  }

  const postsSpan = document.getElementById('posts-display');
  if (postsSpan) {
      postsSpan.textContent = '0';
  }

  const followingSpan = document.getElementById('following-display');
  if (followingSpan) {
      followingSpan.textContent = '0';
  }

  refreshData(); // Trigger data refresh to update counts
}

// Fetch and display profile data in a modal
function fetchAndDisplayProfile(username) {
  if (!username) {
      console.error('Username is missing for profile fetch.');
      return;
  }

  fetch(`${basePath}/profile/${username}`)
      .then(response => {
          if (!response.ok) {
              throw new Error(`Failed to fetch profile for ${username}`);
          }
          return response.json();
      })
      .then(data => {
          if (data.success) {
              // Populate profile modal
              document.getElementById('modal-username-display').textContent = data.profile.username;
              document.getElementById('modal-posts-display').textContent = data.profile.postCount;
              document.getElementById('modal-followers-display').textContent = data.profile.followers.length;
              document.getElementById('modal-following-display').textContent = data.profile.following.length;

              openUserProfileModal(username); 
          } else {
              console.error('Profile fetch unsuccessful:', data);
          }
      })
      .catch(error => console.error('Error fetching profile:', error));
}

// Function to open user profile modal when a username in the feed is clicked
function openUserProfileModal(username) {
  // Fetch the login status first
  fetch(`${basePath}/login`)
    .then(response => response.json())
    .then(loginData => {
        if (!loginData.loggedIn) {
            console.log('User is not logged in. Hiding follow button.');
        }

        // Fetch the profile data of the targeted user
        fetch(`${basePath}/profile/${username}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const profile = data.profile;
                    const followers = profile.followers || [];
                    const following = profile.following || [];
                    const isFollowing = data.isFollowing || false;

                    // Ensure profilePictureUrl is correctly constructed
                    let profilePictureUrl;
                    if (profile.profilePicture) {
                        // If the profile picture exists, prepend the base path if necessary
                        if (profile.profilePicture.startsWith('/uploads/')) {
                            // The image path starts with /uploads, so no need to prepend basePath
                            profilePictureUrl = profile.profilePicture;
                        } else {
                            // If it's an absolute URL, just use it directly
                            profilePictureUrl = profile.profilePicture;
                        }
                    } else {
                        // Default profile picture if none is set
                        profilePictureUrl = `${basePath}/uploads/profile-pictures/default-profile.png`;
                    }

                    const modalContent = document.getElementById('userProfileModalContent');

                    // Check if the user is viewing their own profile
                    const isOwnProfile = loginData.loggedIn && loginData.username === profile.username;

                    // Check if the logged-in user and the profile owner are friends
                    const isFriends =
                        isFollowing &&
                        followers.includes(loginData.username) &&
                        profile.following.includes(loginData.username);

                    // Render modal content
                    modalContent.innerHTML = `
                        <div class="profile-modal-content">
                            <!-- Profile Picture -->
                            <div class="profile-picture-container-modal">
                                <img id="profilePictureModal" class="profile-picture-modal" src="${profilePictureUrl}" alt="Profile Picture">
                            </div>
                            <!-- Profile Details -->
                            <div class="profile-details-modal">
                                <h2 id="profileUsername">@${profile.username}</h2>
                                <div class="profile-stats">
                                    <p>Posts: <span id="profilePostsCount">${profile.postCount || 0}</span></p>
                                    <p>Followers: <span id="profileFollowersCount">${followers.length}</span></p>
                                    <p>Following: <span id="profileFollowingCount">${following.length}</span></p>
                                </div>
                            </div>
                        </div>
                    `;

                    // Add follow button only if user is logged in and not viewing their own profile
                    if (loginData.loggedIn && !isOwnProfile) {
                        const followButton = document.createElement('button');
                        followButton.className = 'btn-follow';
                        followButton.setAttribute('data-username', username);
                        followButton.textContent = isFriends ? 'Friends' : isFollowing ? 'Unfollow' : 'Follow';
                        followButton.addEventListener('click', () => toggleFollowProfile(username));
                        modalContent.appendChild(followButton);
                    }

                    // Open the modal to display profile
                    openModal('userProfileModal');
                } else {
                    throw new Error('Failed to retrieve profile data.');
                }
            })
            .catch(error => {
                console.error('Error fetching profile:', error);
                alert('Unable to load user profile. Please try again later.');
            });
    })
    .catch(error => {
        console.error('Error checking login status:', error);
    });
}

function toggleFollowProfile(username) {
  console.log('Follow button clicked for username:', username);

  fetch(`${basePath}/follow/${username}`, { method: 'POST' })
      .then(response => response.json())
      .then(data => {
          if (data.success) {
              const modalContent = document.getElementById('userProfileModalContent');
              const followButton = modalContent.querySelector('.btn-follow');
              const followersCountElement = modalContent.querySelector('p:nth-of-type(2)');

              // Update follower count
              if (followersCountElement) {
                  followersCountElement.textContent = `Followers: ${data.updatedFollowersCount}`;
              }

              // Remove any existing classes and add appropriate class based on state
              followButton.classList.remove('friends-status');
              if (data.isFriends) {
                  followButton.textContent = 'Friends';
                  followButton.classList.add('friends-status');
              } else {
                  followButton.textContent = data.isFollowing ? 'Unfollow' : 'Follow';
              }
          } else {
              console.error('Failed to toggle follow status:', data.message);
          }
      })
      .catch(error => {
          console.error('Error toggling follow status:', error);
          alert('Failed to toggle follow status.');
      });
}

// Add this function to handle clicking a username in the feed
function displayUserProfile(username) {
  fetch(`/profile/${username}`)
      .then(response => response.json())
      .then(data => {
          if (data.success) {
              // Set the profile username
              document.getElementById('profileUsername').textContent = '@' + data.user.username;

              // Display the user's posts
              const postsContent = document.getElementById('userPostsContent');
              postsContent.innerHTML = '';  // Clear existing posts
              data.user.posts.forEach(post => {
                  const postElement = document.createElement('div');
                  postElement.classList.add('post');
                  postElement.textContent = post.content;
                  postsContent.appendChild(postElement);
              });

              // Display following and followers count
              document.getElementById('followingCount').textContent = `Following: ${data.user.following.length}`;
              document.getElementById('followersCount').textContent = `Followers: ${data.user.followers.length}`;

              // Set follow button text based on whether the user is already followed
              const followButton = document.getElementById('followButton');
              if (data.isFollowing) {
                  followButton.textContent = 'Unfollow';
              } else {
                  followButton.textContent = 'Follow';
              }

              // Open the profile modal
              openModal('userProfileModal');
          }
      });
}

// Attach username click events to dynamically generated content
function attachUsernameClickEvents() {
  const feedContent = document.getElementById('feed-content');

  if (feedContent) {
    // Ensure no duplicate event listeners are attached
    feedContent.removeEventListener('click', usernameClickHandler);

    // Attach a single event listener to the parent container
    feedContent.addEventListener('click', usernameClickHandler);
  }
}

// Event handler for username clicks in the feed
function usernameClickHandler(event) {
  const target = event.target;

  // Check if the clicked element is a username link
  if (target.classList.contains('username-link')) {
    event.preventDefault(); // Prevent default link behavior
    const username = target.getAttribute('data-username'); // Retrieve data-username
    if (username) {
      openUserProfileModal(username); // Open user profile modal
    } else {
      console.error('Error: Username is null or undefined.');
    }
  }
}

function uploadProfilePicture() {
  const fileInput = document.getElementById('profile-picture-input');
  const file = fileInput.files[0];

  if (!file) {
      alert('Please choose a file.');
      return;
  }

  const formData = new FormData();
  formData.append('image', file);

  fetch(`${basePath}/uploadPhoto`, {
      method: 'POST',
      body: formData,
      credentials: 'include', // Ensure session cookie is sent
  })
      .then((response) => {
          if (!response.ok) {
              throw new Error('Failed to upload profile picture');
          }
          return response.json();
      })
      .then((data) => {
          document.getElementById('profile-picture').src = data.imageUrl;
          alert('Profile picture updated successfully');
      })
      .catch((error) => {
          console.error('Error uploading profile picture:', error);
          alert('Failed to upload profile picture');
      });
}

function register() {
  const email = document.getElementById('register-email').value.trim();
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value.trim();
  const repassword = document.getElementById('register-repassword').value.trim();
  const age = document.getElementById('register-age').value.trim();

  fetch(`${basePath}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, username, password, repassword, age }),
  })
    .then(response => {
      if (!response.ok) {
        // Handle non-OK responses and extract backend validation errors
        return response.json().then(data => {
          throw new Error(data.message || 'Failed to register user');
        });
      }
      return response.json();
    })
    .then(data => {
      // On successful registration
      alert(data.message); // Show success message
      closeModal('registerModal'); // Close the register modal
    })
    .catch(error => {
      // Show the backend validation errors in the error modal
      showErrorModal(formatErrorMessages(error.message));
    });
}

function login() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!username || !password) {
    showErrorModal('Please provide both username and password.');
    return;
  }

  fetch(`${basePath}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.message || 'An error occurred.');
        });
      }
      return response.json();
    })
    .then(data => {
      sessionStorage.setItem('username', data.username);

      const profilePicture = document.getElementById('profile-picture');
      if (profilePicture) {
        profilePicture.src = data.profilePicture; // Update profile picture
      }

      alert(data.message); // Show success message
      closeModal('loginModal'); // Close the login modal
      checkLoginStatus(); // Refresh the UI to reflect the login state
    })
    .catch(error => {
      showErrorModal(error.message);
    });
}

function checkLoginStatus() {
  fetch(`${basePath}/login`, {
      method: 'GET',
      credentials: 'include', // Ensures the session cookie is sent
  })
      .then((response) => {
          if (!response.ok) {
              throw new Error('Failed to check login status');
          }
          return response.json();
      })
      .then((data) => {
          if (data.loggedIn) {
              // Update UI for logged-in state
              const profileSection = document.getElementById('profile-section');
              const addPostSection = document.getElementById('add-post-section');
              const usernameDisplay = document.getElementById('username-display');
              const postsDisplay = document.getElementById('posts-display');
              const modalUsernameDisplay = document.getElementById('modal-username-display');
              const modalPostsDisplay = document.getElementById('modal-posts-display');
              const modalFollowersDisplay = document.getElementById('modal-followers-display');
              const modalFollowingDisplay = document.getElementById('modal-following-display');
              const profilePicture = document.getElementById('profile-picture');

              if (profileSection) profileSection.style.display = 'block';
              if (addPostSection) addPostSection.style.display = 'block';
              if (usernameDisplay) usernameDisplay.textContent = data.username;
              if (postsDisplay) postsDisplay.textContent = data.posts || 0; // Default to 0 if undefined
              if (modalUsernameDisplay) modalUsernameDisplay.textContent = data.username;
              if (modalPostsDisplay) modalPostsDisplay.textContent = data.posts || 0; // Default to 0 if undefined
              if (modalFollowersDisplay) modalFollowersDisplay.textContent = data.followers || 0; // Default to 0
              if (modalFollowingDisplay) modalFollowingDisplay.textContent = data.following || 0; // Default to 0

              // Update profile picture if available
              if (profilePicture) {
                  profilePicture.src = data.profilePicture || `${basePath}/uploads/profile-pictures/default-profile.png`; // Default if none exists
              }

              // Reattach username click events
              attachUsernameClickEvents();
          } else {
              // Update UI for logged-out state
              const profileSection = document.getElementById('profile-section');
              const addPostSection = document.getElementById('add-post-section');
              const profilePicture = document.getElementById('profile-picture');

              if (profileSection) profileSection.style.display = 'none';
              if (addPostSection) addPostSection.style.display = 'none';

              // Reset profile picture to default
              if (profilePicture) {
                  profilePicture.src = `${basePath}/uploads/profile-pictures/default-profile.png`; // Ensure proper default
              }
          }

          // Always show the feed regardless of login status
          const feedContent = document.getElementById('feed-content');
          if (feedContent) feedContent.style.display = 'block';
      })
      .catch((error) => console.error('Error checking login status:', error));
}

function logout() {
  // Check if the user is logged in
  fetch(`${basePath}/login`, {
    method: 'GET',
    credentials: 'include', // Include credentials for session check
  })
    .then(response => response.json())
    .then(data => {
      if (!data.loggedIn) {
        // If user is not logged in, show an alert
        alert('You are not logged in');
      } else {
        // Proceed with the logout request
        fetch(`${basePath}/login`, {
          method: 'DELETE',
        })
          .then(response => response.json())
          .then(data => {
            if (data.message === 'Logged out successfully') {
              alert('You have logged out successfully!');
              window.location.reload(); // Reload the page to reset the UI
            } else {
              alert('Failed to log out');
            }
          })
          .catch(error => {
            console.error('Logout error:', error);
            alert('An error occurred during logout.');
          });
      }
    })
    .catch(error => {
      console.error('Error checking login status:', error);
      alert('An error occurred. Please try again.');
    });
}

function uploadPost() {
  const blogContent = document.getElementById('blog-content').value.trim();
  
  if (blogContent.length > 300) {
      alert('Your post exceeds the 300 character limit.');
      return; // Don't proceed if the content is too long
  }

  const photoUpload = document.getElementById('photo-upload').files[0];

  if (!blogContent) {
      alert('Please enter your blog content.');
      return;
  }

  const formData = new FormData();
  formData.append('content', blogContent);
  if (photoUpload) {
      formData.append('image', photoUpload);
  }

  fetch(`${basePath}/contents`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
  })
      .then((response) => {
          if (response.ok) {
              return response.json();
          } else {
              throw new Error('Failed to upload post');
          }
      })
      .then(() => {
          // Clear inputs after successful upload
          document.getElementById('blog-content').value = ''; // Clear the content text area
          resetFileName(); // Reset the file name input

          // Reset the character counter
          const charCounter = document.getElementById('char-counter');
          charCounter.textContent = '0/300';  // Reset counter to 0/300

          alert('Post uploaded successfully!');

          // Fetch total pages and jump to the last page
          fetch(`${basePath}/allshow`)
              .then((response) => response.json())
              .then((data) => {
                  currentPage = data.totalPages; // Set currentPage to the last page
                  fetchAndDisplayPosts() // Refresh the feed
                      .then(() => {
                          scrollToBottom(); // Scroll to the bottom of the page after loading
                      });
              })
              .catch((error) => {
                  console.error('Error fetching total pages:', error);
                  alert('Failed to navigate to the last page.');
              });

          // Switch to Feed view and ensure Feed tab is selected
          switchFeed('feed');
      })
      .catch((error) => {
          console.error('Error uploading post:', error);
          alert('Failed to upload post.');
      });
}

function createPostElement(post) {
  const postElement = document.createElement('div');
  postElement.classList.add('post');
  postElement.id = post._id.toString();

  const usernameElement = document.createElement('div');
  usernameElement.innerHTML = `<a href="#" class="username-link" data-username="${post.username}" onclick="openUserProfileModal('${post.username}')">@${post.username}</a>`;
  postElement.appendChild(usernameElement);

  const contentElement = document.createElement('div');
  contentElement.textContent = post.content;
  postElement.appendChild(contentElement);

  // Update this section to handle image URLs correctly
  if (post.imageURL) {
    const imageElement = document.createElement('img');
    // Check if the imageURL already includes the basePath
    imageElement.src = post.imageURL.startsWith(basePath) ? post.imageURL : `${basePath}${post.imageURL}`;
    imageElement.alt = 'Post Image';
    imageElement.style.maxWidth = '100%';
    postElement.appendChild(imageElement);
  }

  return postElement;
}

function displayAllPosts(posts) {
  const feedContent = document.getElementById('feed-content');
  feedContent.innerHTML = '';

  posts.forEach(post => {
    const postElement = document.createElement('div');
    postElement.classList.add('post');
    postElement.id = post._id.toString();

    const usernameElement = document.createElement('div');
    usernameElement.innerHTML = `<a href="#" class="username-link" data-username="${post.username}">@${post.username}</a>`;
    usernameElement.querySelector('a').addEventListener('click', (event) => {
      event.preventDefault();
      openUserProfileModal(post.username);
    });

    const contentElement = document.createElement('div');
    contentElement.textContent = post.content;

    postElement.appendChild(usernameElement);
    postElement.appendChild(contentElement);

    // Update this section to handle image URLs correctly
    if (post.imageURL) {
      const imageElement = document.createElement('img');
      // Check if the imageURL already includes the basePath
      imageElement.src = post.imageURL.startsWith(basePath) ? post.imageURL : `${basePath}${post.imageURL}`;
      imageElement.alt = 'Post Image';
      imageElement.style.maxWidth = '100%';
      postElement.appendChild(imageElement);
    }

    feedContent.appendChild(postElement);
  });
}

// Modify the fetchAndDisplayPosts function to handle sorting
function fetchAndDisplayPosts() {
  return new Promise((resolve, reject) => {
    const url = `${basePath}/allshow?page=${currentPage}`;

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        const feedContent = document.getElementById('feed-content');
        feedContent.innerHTML = ''; // Clear existing posts

        if (data.posts.length === 0) {
          feedContent.innerHTML = '<p>No posts to display at the moment.</p>';
          handlePaginationControls(currentFeedType, data.totalPages);
          return resolve(); // Resolve if no posts
        }

        // Sort posts based on the currentSortOrder
        const sortedPosts = currentSortOrder === 'latest' ? data.posts.reverse() : data.posts;

        // Display sorted posts
        sortedPosts.forEach((post) => {
          try {
            const postElement = createPostElement(post);
            feedContent.appendChild(postElement);
          } catch (error) {
            console.error(`Error rendering post ID ${post._id}:`, error);
          }
        });

        // Handle pagination visibility and controls
        handlePaginationControls(currentFeedType, data.totalPages);
        resolve(); // Resolve after posts are displayed
      })
      .catch((error) => {
        console.error('Error fetching posts:', error);
        const feedContent = document.getElementById('feed-content');
        feedContent.innerHTML = `<p class="error-message">Error fetching posts: ${error.message}</p>`;
        reject(error); // Reject in case of an error
      });
  });
}


function fetchAndDisplayAllPosts() {
  const url = `${basePath}/allshow?page=${currentPage}`;
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      const feedContent = document.getElementById('feed-content');
      const paginationElement = document.getElementById('pagination');
      
      feedContent.innerHTML = '';  // Clear the existing posts
      
      if (data.posts.length === 0) {
        feedContent.innerHTML = '<p>No posts to display at the moment.</p>';
        
        if (paginationElement) {
          paginationElement.style.display = 'block';
        }
        
        // Disable pagination if no posts
        updatePaginationButtons(data.totalPages);
        return;
      }
      
      // Loop through each post and create its element
      data.posts.forEach(post => {
        const postElement = createPostElement(post);
        feedContent.appendChild(postElement);
      });
      
      // Show pagination and update buttons
      if (paginationElement) {
        paginationElement.style.display = 'block';
        updatePaginationButtons(data.totalPages);
      }
    })
    .catch(error => {
      console.error('Error fetching all posts:', error);
      const feedContent = document.getElementById('feed-content');
      feedContent.innerHTML = `<p class="error-message">Error fetching posts: ${error.message}</p>`;
    });
}

function fetchAndDisplayUserPosts() {
  fetch(`${basePath}/posts`, { credentials: 'include' }) // Ensure cookies are sent for authentication
      .then(response => {
          if (!response.ok) {
              throw new Error('Failed to fetch user posts.');
          }
          return response.json();
      })
      .then(data => {
          const feedContent = document.getElementById('userPostsContent');
          feedContent.innerHTML = ''; // Clear existing posts

          if (data.posts.length === 0) {
              feedContent.innerHTML = '<p>No posts to display.</p>';
              return;
          }

          data.posts.forEach(post => {
              const postElement = document.createElement('div');
              postElement.classList.add('post');
              postElement.id = post._id.toString();

              // Add username
              const usernameElement = document.createElement('div');
              usernameElement.innerHTML = `<a href="#" class="username-link" data-username="${post.username}" onclick="openUserProfileModal('${post.username}')">@${post.username}</a>`;
              postElement.appendChild(usernameElement);

              // Add post content
              const contentElement = document.createElement('div');
              contentElement.textContent = post.content;
              postElement.appendChild(contentElement);

              // Add image if available
              if (post.imageURL) {
                  const imageElement = document.createElement('img');
                  // Ensure proper basePath handling
                  imageElement.src = post.imageURL.startsWith(basePath) ? post.imageURL : `${basePath}${post.imageURL}`;
                  imageElement.alt = 'Post Image';
                  imageElement.style.maxWidth = '100%'; // Ensure the image fits within the post container
                  imageElement.style.marginTop = '10px'; // Add some spacing
                  postElement.appendChild(imageElement);
              }

              feedContent.appendChild(postElement); // Append the post to the content container
          });
      })
      .catch(error => {
          console.error('Error fetching user posts:', error);
          const feedContent = document.getElementById('userPostsContent');
          feedContent.innerHTML = `<p class="error-message">Error fetching posts: ${error.message}</p>`;
      });
}


// Function to fetch and display posts from followed users
function fetchAndDisplayFollowingPosts() {
  console.log('Fetching posts from followed users...');
  
  // Hide pagination for following posts
  const paginationElement = document.getElementById('pagination');
  if (paginationElement) {
    paginationElement.style.display = 'none';
  }

  fetch(`${basePath}/contents`, {
    credentials: 'include', // Ensure cookies are sent for authentication
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch following posts: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Following posts fetched:', data); // Debugging
      const feedContent = document.getElementById('feed-content');
      feedContent.innerHTML = ''; // Clear existing posts
      
      if (data.posts.length === 0) {
        feedContent.innerHTML = '<p>No posts from followed users to display.</p>';
        return;
      }
      
      data.posts.forEach(post => {
        const postElement = createPostElement(post);
        feedContent.appendChild(postElement);
      });
    })
    .catch(error => {
      console.error('Error fetching following posts:', error.message);
      const feedContent = document.getElementById('feed-content');
      feedContent.innerHTML = `<p class="error-message">Error fetching posts: ${error.message}</p>`;
    });
}





function addPhoto() {
  const fileInput = document.getElementById('photo-upload');
  const file = fileInput.files[0];

  if (!file) {
    alert('Please choose a file.');
    return;
  }

  const formData = new FormData();
  formData.append('image', file);

  fetch(`${basePath}/uploadPhoto`, {
    method: 'POST',
    body: formData
  })
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Failed to upload photo');
    })
    .then(data => {
      document.getElementById('photo-url').value = data.imageUrl;
      alert('Photo uploaded successfully');
    })
    .catch(error => {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo');
    });
}


// Function to update pagination buttons based on the total number of pages
function updatePaginationButtons(totalPages) {
  const prevButton = document.getElementById('prev-page');
  const nextButton = document.getElementById('next-page');

  // Handle previous button
  if (currentPage === 1) {
    prevButton.disabled = true;
  } else {
    prevButton.disabled = false;
  }

  // Handle next button
  if (currentPage === totalPages || totalPages === 0) {
    nextButton.disabled = true;
  } else {
    nextButton.disabled = false;
  }
}

// Function to handle the visibility of pagination controls based on feed type
function handlePaginationControls(feedType, totalPages) {
  const paginationElement = document.getElementById('pagination');
  const prevButton = document.getElementById('prev-page');
  const nextButton = document.getElementById('next-page');

  if (feedType === 'following') {
    // Hide pagination controls in the "following" feed
    paginationElement.style.display = 'none';
  } else {
    // Show pagination controls for "all posts" feed
    paginationElement.style.display = 'block';

    // Update pagination buttons
    updatePaginationButtons(totalPages);
  }
}

// Connect to the Socket.io server
const socket = io('/M00949455');

let socketInitialized = false;
if (!socketInitialized) {
    const socket = io();
    socket.on('newPost', (post) => {
      const feedContent = document.getElementById('feed-content');
  
      // Create new post element
      const postElement = document.createElement('div');
      postElement.classList.add('post');
  
      // Set the post ID for linking
      postElement.id = post._id.toString(); // Add this line
  
      // Add spacing
      const spacingElement = document.createElement('div');
      spacingElement.style.height = '2em';
      postElement.appendChild(spacingElement);
  
      // Add username
      const usernameElement = document.createElement('div');
      usernameElement.textContent = `@${post.username}`;
      postElement.appendChild(usernameElement);
  
      // Add content
      const contentElement = document.createElement('div');
      contentElement.textContent = post.content;
      postElement.appendChild(contentElement);
  
      // Add image if exists
      if (`${basePath}${post.imageURL}`) {
          const imageElement = document.createElement('img');
          imageElement.src = `${basePath}${post.imageURL}`;
          postElement.appendChild(imageElement);
      }
  
      // Prepend post to feed
      feedContent.insertBefore(postElement, feedContent.firstChild);
  });
  
    socketInitialized = true;
}