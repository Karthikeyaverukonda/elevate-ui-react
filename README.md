Elevate - Employee Recognition Platform 🚀

Welcome to Elevate! This is an employee recognition platform I built to make appreciating teammates fun, fair, and meaningful. It’s designed to gamify the process of saying "good job" while solving the tricky problem of balancing scores between big and small teams.

✨ What's Inside?

👤 For Employees

Send Kudos: You can nominate peers for specific vibes like "Bug Slayer" or "Team Player".

Live Leaderboard: Check who is crushing it this sprint (and look back at past winners).

Your Space: A personal profile where you can upload your own photo, change your password, and see your "Badge Vault" of past wins.

Fair Play: I implemented a special scoring system so you aren't at a disadvantage just because your team is small.

🚂 For Train Managers

Manage the Crew: Easily add new employees to specific departments.

Oversee Sprints: Keep track of the team structure and manage login credentials.

👑 For Admins

The Control Room: Create Train Manager accounts and keep an eye on system stats.

Security: Ensure everyone sets a secure password on their first login.

🛠️ The Tech Stack

I built this using a modern, fast, and lightweight stack:

Frontend: React + TypeScript + Vite (Super fast dev experience)

Styling: Tailwind CSS (For that clean, modern look)

Icons: Lucide React

State/Database: LocalStorage (This acts as a "simulated backend" so the app works instantly without a server)

Notifications: Sonner

🧠 The "Fairness Algorithm" (Damped Scoring)

One of the coolest parts of this project is how it handles scoring. I realized that in a huge team (like Engineering), getting 5 votes is "easier" than getting 5 votes in a tiny team (like Design) simply because there are more people to vote.

To fix this, I used a Damped Scoring formula:

Base Value: 50 Points.

The Math: Score = 50 * (3.0 / √Voters)

Basically:

If you're in a Small Team (2 people), a single vote is worth ~150 points (High Impact).

If you're in a Large Team (12 people), a single vote is worth ~45 points (Volume required).

This ensures a top performer in a small team has a fair shot at the leaderboard against a top performer in a huge team.

🚀 How to Run It

1. Installation

Grab the code and install the dependencies:

npm install
# or
bun install


2. Start the App

Fire up the local server:

npm run dev
# or
bun dev


3. Log In (Test Accounts)

Since there's no real backend, I've pre-loaded some accounts for you to try out different roles:

Role

Name

Password

Admin

Admin

admin123

Train Manager

Steven Strange

password123

Employee

Sarah Johnson

password123

Employee

John Doe

password123

Heads up: If you create a new user via the dashboard, the default password will usually be whatever you set it to (e.g., password123).

📂 How It's Organized

src/pages: The main screens (Home, Login, Leaderboard, Dashboards).

src/components: Reusable UI blocks like the Employee Cards and Profile Settings.

src/lib/localStorage.ts: This is the heavy lifter—it mimics a database and handles all the Auth & Data logic.

src/lib/sprintUtils.ts: Handles the math for figuring out which Sprint (Quarter) we are currently in.

📸 Try It Out

Log in as an Employee (try Sarah!) and cast a vote for someone.

Check the Leaderboard to see how the weighted scoring updates in real-time.

Click your Profile Picture in the header to upload a custom avatar or check your history.

Want to see the management side? Log out and sign in as Admin or Train Manager to add new people to the system.


Invalid Comment Format:
Min 10 non-special chars	"hi!", "ok thanks"
At least 2 words	"greatjobwelldonethanks" (one long word)
No 4+ repeated chars	"aaaaaaaaaa", "1111111111"
No keyboard row walks (5+ chars)	"asdfghjkl", "qwertyyy", "zxcvbnm"
Min 5 unique characters	"ababababab", "aabbccaabb" 