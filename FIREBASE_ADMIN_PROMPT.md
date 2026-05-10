Role: Senior Full-Stack Developer (Firebase V10+ Specialist).

Goal: Transform my static HTML gaming store into a dynamic Admin Panel using Firestore, strictly following the document structure shown in my database.

1. Data Schema Integration (CRITICAL)
Your JavaScript logic must handle the following fields exactly as they appear in my Firestore Items collection:

Strings: name, categoryID, condition, description, genre, imageUrl, platform, videoTrailerUrl.

Numbers: originalPrice, discountPrice (Handle these for price display logic).

Timestamp: createdAt (Use serverTimestamp()).

2. Core Instructions:
A. Authentication & Security
Implement a manual login check against the AdminUsers collection (matching username and passhash).

Only show the "Add/Edit/Delete" UI elements if the user is authenticated.

B. Dynamic UI Rendering
Replace the static PS4_GAMES and PS5_GAMES arrays.

Use my existing renderGameGrid(targetId, games, platform) function.

Logic: When fetching data, map the Firestore fields to the object format expected by renderGameGrid. For example, ensure imageUrl from Firestore maps to the img property used in your rendering logic.

C. Admin CRUD Features
Categories Dropdown: Fetch all categories from the Categories collection to populate the categoryID selection in the "Add Item" form.

Price Logic: In the UI, if discountPrice > 0, show the original price with a strikethrough.

Item Management: - Create a form to add new items using all the fields mentioned above.

Add a "Delete" button to each game card using the Firestore Document ID.

Implement an "Edit" functionality that pre-fills the form with existing data.

3. Technical Requirements:
Use Modular Firebase SDK (v10).

No CSS Changes: All styles must come from my existing inline CSS in Otman_fixed.html.

Provide a clean firebase.js for configuration.

Provide the main logic in a separate block, identifying any new HTML id attributes I need to add to my inputs (e.g., <input id="originalPrice">).

4. Expected Output:
Complete firebase.js setup.

JavaScript logic for: Authentication, Fetching/Filtering items by platform, and CRUD operations.

A checklist of HTML IDs I need to insert into my Otman_fixed.html to bind the JS to the UI.