// userComplaintCounters.js

// Example in-memory storage (you can replace this with a database)
const userCounters = {};

function initializeUserCounter(userId) {
  userCounters[userId] = 0;
}

function generateComplaintNumber(userId) {
  if (!(userId in userCounters)) {
    initializeUserCounter(userId);
  }

  userCounters[userId]++;
  return `${userCounters[userId]}`;
}

module.exports = generateComplaintNumber;
