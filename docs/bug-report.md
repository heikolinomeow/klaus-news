Problem: The "Posts Per Fetch" setting in the UI is non-functional. It displays a number input (default 5) that the user can change, but changing it has no effect on the actual number of posts fetched.

Root cause: In x_client.py:50, the max_results parameter sent to the X API is hardcoded to 5. The function accepts a max_results argument but ignores it completely when building the request parameters.

Current flow:

User changes "Posts Per Fetch" to e.g. 20 in the UI
Frontend saves this value to the posts_per_fetch setting in the database
When ingestion runs (manual or scheduled), it calls fetch_posts_from_list()
That function ignores any passed value and always requests 5 posts from X API
What You Want
A single "Posts Per Fetch" setting that controls how many posts are fetched from each X list
This setting must work for both:
Scheduled automatic fetches (the background job)
Manual "Trigger Ingestion Now" button clicks
The setting must be:
Configurable in the UI (already exists visually)
Persisted to the database (already happens)
Actually read by the backend when making X API calls (missing)
Passed through to the X API max_results parameter (missing)
What's Missing
The scheduler/ingestion job doesn't read the posts_per_fetch setting from the database
The X client doesn't use the max_results parameter it receives - it's hardcoded
There's no connection between the saved setting and the actual API call