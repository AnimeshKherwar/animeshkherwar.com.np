/* Cricket, Unreasonably Serious — bundled roster data (no live fetching).
   IMPORTANT STATUS: these squads were compiled from the builder's prior knowledge and were NOT
   re-verified against official sources at build time (no source checking was possible in the
   build session). Every snapshot is therefore labelled "UNVERIFIED FALLBACK". See ROSTER-SOURCES.md.
   Player identities use stable IDs (slug of name) so one person can appear in an international
   squad and an IPL squad without duplicate records.
   Line format: "Name|ROLE|BatHand|BowlStyle"  ROLE: BAT, WK, AR, BOWL. BowlStyle "-" = does not bowl.
   Bowling codes: RF RFM RM (right-arm fast / fast-medium / medium), LF LFM LM (left-arm),
   OB off-break, LB leg-break, SLA slow left-arm orthodox, LWS left-arm wrist spin. */
(function (root) {
  'use strict';
  var CRK = root.CRK = root.CRK || {};

  var SNAPSHOT = {
    status: 'UNVERIFIED FALLBACK',
    compiled: '2026-10-26',
    basis: 'Builder knowledge of squads up to roughly mid-2025; not checked against sources at build time.',
    note: 'One squad pool per team is used for Test, ODI and T20 (disclosed fallback — not format-specific).'
  };

  var INTL = [
    { id: 'AFG', name: 'Afghanistan', short: 'AFG', c1: '#1f4fbf', c2: '#d32f2f', test: true, cap: 'Hashmatullah Shahidi', p: [
      'Hashmatullah Shahidi|BAT|L|-', 'Rahmanullah Gurbaz|WK|R|-', 'Ibrahim Zadran|BAT|R|-', 'Rahmat Shah|BAT|R|LB', 'Sediqullah Atal|BAT|L|-',
      'Azmatullah Omarzai|AR|R|RFM', 'Mohammad Nabi|AR|R|OB', 'Gulbadin Naib|AR|R|RM', 'Karim Janat|AR|R|RM', 'Ikram Alikhil|WK|L|-',
      'Rashid Khan|AR|R|LB', 'Noor Ahmad|BOWL|L|LWS', 'Mujeeb Ur Rahman|BOWL|R|OB', 'Fazalhaq Farooqi|BOWL|L|LFM', 'Naveen-ul-Haq|BOWL|R|RFM', 'Fareed Ahmad|BOWL|L|LFM'] },
    { id: 'AUS', name: 'Australia', short: 'AUS', c1: '#f2c200', c2: '#0b6b3a', test: true, cap: 'Pat Cummins', p: [
      'Travis Head|BAT|L|OB', 'Usman Khawaja|BAT|L|-', 'Sam Konstas|BAT|R|-', 'Marnus Labuschagne|BAT|R|LB', 'Steve Smith|BAT|R|LB',
      'Mitchell Marsh|AR|R|RM', 'Cameron Green|AR|R|RFM', 'Glenn Maxwell|AR|R|OB', 'Marcus Stoinis|AR|R|RM', 'Tim David|BAT|R|-',
      'Alex Carey|WK|L|-', 'Josh Inglis|WK|R|-', 'Pat Cummins|BOWL|R|RF', 'Mitchell Starc|BOWL|L|LF', 'Josh Hazlewood|BOWL|L|RFM',
      'Nathan Lyon|BOWL|R|OB', 'Adam Zampa|BOWL|R|LB'] },
    { id: 'BAN', name: 'Bangladesh', short: 'BAN', c1: '#006a4e', c2: '#f42a41', test: true, cap: 'Najmul Hossain Shanto', p: [
      'Najmul Hossain Shanto|BAT|L|OB', 'Tanzid Hasan|BAT|L|-', 'Mominul Haque|BAT|L|SLA', 'Towhid Hridoy|BAT|R|-', 'Litton Das|WK|R|-',
      'Mushfiqur Rahim|WK|R|-', 'Jaker Ali|WK|R|-', 'Mehidy Hasan Miraz|AR|R|OB', 'Rishad Hossain|BOWL|R|LB', 'Taijul Islam|BOWL|L|SLA',
      'Taskin Ahmed|BOWL|L|RF', 'Mustafizur Rahman|BOWL|L|LFM', 'Shoriful Islam|BOWL|L|LFM', 'Nahid Rana|BOWL|R|RF', 'Tanzim Hasan Sakib|BOWL|R|RFM'] },
    { id: 'ENG', name: 'England', short: 'ENG', c1: '#0b2a6f', c2: '#cf142b', test: true, cap: 'Ben Stokes', p: [
      'Zak Crawley|BAT|R|-', 'Ben Duckett|BAT|L|-', 'Ollie Pope|BAT|R|-', 'Joe Root|BAT|R|OB', 'Harry Brook|BAT|R|RM',
      'Ben Stokes|AR|L|RFM', 'Jamie Smith|WK|R|-', 'Jos Buttler|WK|R|-', 'Phil Salt|WK|R|-', 'Jacob Bethell|AR|L|SLA',
      'Liam Livingstone|AR|R|LB', 'Chris Woakes|AR|R|RFM', 'Gus Atkinson|BOWL|R|RF', 'Brydon Carse|BOWL|R|RF', 'Jofra Archer|BOWL|R|RF',
      'Mark Wood|BOWL|R|RF', 'Shoaib Bashir|BOWL|R|OB', 'Adil Rashid|BOWL|R|LB'] },
    { id: 'IND', name: 'India', short: 'IND', c1: '#1c4fa1', c2: '#ff8c1a', test: true, cap: 'Shubman Gill', p: [
      'Yashasvi Jaiswal|BAT|L|LB', 'Rohit Sharma|BAT|R|OB', 'Shubman Gill|BAT|R|-', 'Virat Kohli|BAT|R|RM', 'Shreyas Iyer|BAT|R|LB',
      'Suryakumar Yadav|BAT|R|-', 'KL Rahul|WK|R|-', 'Rishabh Pant|WK|L|-', 'Sanju Samson|WK|R|-', 'Hardik Pandya|AR|R|RFM',
      'Ravindra Jadeja|AR|L|SLA', 'Axar Patel|AR|L|SLA', 'Washington Sundar|AR|L|OB', 'Abhishek Sharma|AR|L|SLA', 'Jasprit Bumrah|BOWL|R|RF',
      'Mohammed Siraj|BOWL|R|RF', 'Arshdeep Singh|BOWL|L|LFM', 'Kuldeep Yadav|BOWL|L|LWS', 'Varun Chakaravarthy|BOWL|R|LB'] },
    { id: 'IRE', name: 'Ireland', short: 'IRE', c1: '#169b62', c2: '#c9d82b', test: true, cap: 'Paul Stirling', p: [
      'Paul Stirling|BAT|R|OB', 'Andrew Balbirnie|BAT|R|OB', 'Harry Tector|BAT|R|OB', 'Ross Adair|BAT|R|-', 'Cade Carmichael|BAT|R|-',
      'Lorcan Tucker|WK|R|-', 'Curtis Campher|AR|R|RM', 'George Dockrell|AR|R|SLA', 'Gareth Delany|AR|R|LB', 'Andy McBrine|AR|L|OB',
      'Mark Adair|AR|R|RFM', 'Josh Little|BOWL|R|LFM', 'Barry McCarthy|BOWL|R|RM', 'Craig Young|BOWL|R|RM', 'Graham Hume|BOWL|R|RFM',
      'Matthew Humphreys|BOWL|R|SLA'] },
    { id: 'NZ', name: 'New Zealand', short: 'NZ', c1: '#111111', c2: '#9adbe8', test: true, cap: 'Tom Latham', p: [
      'Devon Conway|BAT|L|-', 'Will Young|BAT|R|-', 'Kane Williamson|BAT|R|OB', 'Mark Chapman|BAT|L|-', 'Tom Latham|WK|L|-',
      'Tom Blundell|WK|R|-', 'Rachin Ravindra|AR|L|SLA', 'Daryl Mitchell|AR|R|RM', 'Glenn Phillips|AR|R|OB', 'Michael Bracewell|AR|L|OB',
      'Mitchell Santner|AR|L|SLA', 'Matt Henry|BOWL|R|RFM', 'Kyle Jamieson|BOWL|R|RF', 'Lockie Ferguson|BOWL|R|RF', "Will O'Rourke|BOWL|R|RF",
      'Jacob Duffy|BOWL|R|RFM', 'Ben Sears|BOWL|R|RF'] },
    { id: 'PAK', name: 'Pakistan', short: 'PAK', c1: '#0b6623', c2: '#e6f2e6', test: true, cap: 'Shan Masood', p: [
      'Shan Masood|BAT|L|RM', 'Abdullah Shafique|BAT|R|-', 'Saim Ayub|BAT|L|OB', 'Babar Azam|BAT|R|OB', 'Fakhar Zaman|BAT|L|SLA',
      'Saud Shakeel|BAT|L|SLA', 'Mohammad Rizwan|WK|R|-', 'Mohammad Haris|WK|R|-', 'Salman Ali Agha|AR|R|OB', 'Shadab Khan|AR|R|LB',
      'Faheem Ashraf|AR|L|RFM', 'Shaheen Shah Afridi|BOWL|L|LF', 'Naseem Shah|BOWL|R|RF', 'Haris Rauf|BOWL|R|RF', 'Hasan Ali|BOWL|R|RFM',
      'Abrar Ahmed|BOWL|R|LB', 'Sajid Khan|BOWL|R|OB', 'Noman Ali|BOWL|L|SLA'] },
    { id: 'SA', name: 'South Africa', short: 'SA', c1: '#007749', c2: '#ffb612', test: true, cap: 'Temba Bavuma', p: [
      'Aiden Markram|BAT|R|OB', 'Ryan Rickelton|WK|L|-', 'Tony de Zorzi|BAT|L|-', 'Temba Bavuma|BAT|R|RM', 'Tristan Stubbs|BAT|R|OB',
      'David Miller|BAT|L|-', 'Dewald Brevis|BAT|R|LB', 'Quinton de Kock|WK|L|-', 'Kyle Verreynne|WK|R|-', 'Wiaan Mulder|AR|R|RM',
      'Marco Jansen|AR|L|LF', 'Senuran Muthusamy|AR|L|SLA', 'Kagiso Rabada|BOWL|L|RF', 'Lungi Ngidi|BOWL|R|RF', 'Gerald Coetzee|BOWL|R|RF',
      'Keshav Maharaj|BOWL|R|SLA', 'Simon Harmer|BOWL|R|OB'] },
    { id: 'SL', name: 'Sri Lanka', short: 'SL', c1: '#0a2f7a', c2: '#ffbe29', test: true, cap: 'Charith Asalanka', p: [
      'Pathum Nissanka|BAT|R|-', 'Kusal Mendis|WK|R|-', 'Kusal Perera|WK|L|-', 'Dinesh Chandimal|WK|R|-', 'Charith Asalanka|BAT|L|OB',
      'Dhananjaya de Silva|AR|R|OB', 'Kamindu Mendis|AR|L|OB', 'Janith Liyanage|AR|R|RM', 'Wanindu Hasaranga|AR|R|LB', 'Dunith Wellalage|AR|L|SLA',
      'Maheesh Theekshana|BOWL|R|OB', 'Prabath Jayasuriya|BOWL|L|SLA', 'Matheesha Pathirana|BOWL|R|RF', 'Asitha Fernando|BOWL|R|RFM',
      'Dilshan Madushanka|BOWL|R|LFM', 'Lahiru Kumara|BOWL|L|RF'] },
    { id: 'WI', name: 'West Indies', short: 'WI', c1: '#7b0a2a', c2: '#f5c518', test: true, cap: 'Shai Hope', p: [
      'Kraigg Brathwaite|BAT|R|OB', 'John Campbell|BAT|L|-', 'Keacy Carty|BAT|R|-', 'Brandon King|BAT|R|-', 'Shimron Hetmyer|BAT|L|-',
      'Rovman Powell|BAT|R|RM', 'Sherfane Rutherford|BAT|L|RM', 'Shai Hope|WK|R|-', 'Roston Chase|AR|R|OB', 'Jason Holder|AR|R|RFM',
      'Justin Greaves|AR|R|RM', 'Romario Shepherd|AR|R|RFM', 'Alzarri Joseph|BOWL|R|RF', 'Shamar Joseph|BOWL|R|RF', 'Jayden Seales|BOWL|R|RF',
      'Kemar Roach|BOWL|R|RF', 'Gudakesh Motie|BOWL|L|SLA', 'Akeal Hosein|BOWL|L|SLA'] },
    { id: 'ZIM', name: 'Zimbabwe', short: 'ZIM', c1: '#d40000', c2: '#fcd116', test: true, cap: 'Craig Ervine', p: [
      'Craig Ervine|BAT|L|-', 'Brian Bennett|BAT|R|OB', 'Ben Curran|BAT|L|-', 'Joylord Gumbie|WK|R|-', 'Clive Madande|WK|R|-',
      'Tafadzwa Tsiga|WK|R|-', 'Sean Williams|AR|L|SLA', 'Sikandar Raza|AR|R|OB', 'Wessly Madhevere|AR|R|OB', 'Ryan Burl|AR|L|LB',
      'Dion Myers|AR|R|RM', 'Blessing Muzarabani|BOWL|R|RF', 'Richard Ngarava|BOWL|L|LFM', 'Tendai Chatara|BOWL|R|RFM',
      'Wellington Masakadza|BOWL|L|SLA', 'Trevor Gwandu|BOWL|R|RFM'] },
    { id: 'NEP', name: 'Nepal', short: 'NEP', c1: '#c8102e', c2: '#003893', test: false, cap: 'Rohit Paudel', p: [
      'Kushal Bhurtel|BAT|R|LB', 'Aasif Sheikh|WK|R|-', 'Rohit Paudel|BAT|R|OB', 'Anil Sah|BAT|R|-', 'Aarif Sheikh|BAT|R|-',
      'Sundeep Jora|BAT|R|-', 'Bhim Sharki|BAT|R|-', 'Kushal Malla|AR|L|SLA', 'Dipendra Singh Airee|AR|R|OB', 'Gulsan Jha|AR|L|RFM',
      'Sompal Kami|AR|R|RFM', 'Karan KC|AR|R|RFM', 'Sandeep Lamichhane|BOWL|R|LB', 'Lalit Rajbanshi|BOWL|R|SLA', 'Abinash Bohara|BOWL|R|RFM',
      'Pratis GC|BOWL|R|RFM'] },
    { id: 'NED', name: 'Netherlands', short: 'NED', c1: '#ff6a13', c2: '#1c2b7a', test: false, cap: 'Scott Edwards', p: [
      "Max O'Dowd|BAT|R|OB", 'Vikramjit Singh|BAT|L|RM', 'Michael Levitt|BAT|R|-', 'Teja Nidamanuru|BAT|R|OB', 'Scott Edwards|WK|R|-',
      'Noah Croes|WK|R|-', 'Bas de Leede|AR|R|RM', 'Sybrand Engelbrecht|AR|R|OB', 'Logan van Beek|AR|R|RFM', 'Roelof van der Merwe|AR|R|SLA',
      'Saqib Zulfiqar|AR|R|LB', 'Tim Pringle|AR|R|SLA', 'Paul van Meekeren|BOWL|R|RFM', 'Vivian Kingma|BOWL|R|RFM', 'Kyle Klein|BOWL|R|RFM',
      'Aryan Dutt|BOWL|R|OB'] }
  ];

  /* IPL — season shown: 2025 (squads as known to the builder; UNVERIFIED, may omit mid-season replacements).
     Entries are either a name already defined above (same identity) or a full line plus "|NAT". */
  var IPL_SEASON = 2025;
  var IPL = [
    { id: 'CSK', name: 'Chennai Super Kings', short: 'CSK', c1: '#f9cd05', c2: '#1d4f9c', cap: 'Ruturaj Gaikwad', p: [
      'Ruturaj Gaikwad|BAT|R|-|IND', 'MS Dhoni|WK|R|-|IND', 'Ravindra Jadeja', 'Shivam Dube|AR|L|RM|IND', 'Devon Conway', 'Rachin Ravindra',
      'Rahul Tripathi|BAT|R|-|IND', 'Vijay Shankar|AR|R|RM|IND', 'Deepak Hooda|AR|R|OB|IND', 'Ravichandran Ashwin|AR|R|OB|IND', 'Sam Curran|AR|L|LFM|ENG',
      'Noor Ahmad', 'Matheesha Pathirana', 'Khaleel Ahmed|BOWL|R|LFM|IND', 'Anshul Kamboj|AR|R|RFM|IND', 'Mukesh Choudhary|BOWL|L|LFM|IND',
      'Nathan Ellis|BOWL|R|RF|AUS', 'Shaik Rasheed|BAT|R|-|IND'] },
    { id: 'MI', name: 'Mumbai Indians', short: 'MI', c1: '#004ba0', c2: '#d1ab3e', cap: 'Hardik Pandya', p: [
      'Rohit Sharma', 'Ryan Rickelton', 'Will Jacks|AR|R|OB|ENG', 'Suryakumar Yadav', 'Tilak Varma|BAT|L|OB|IND', 'Hardik Pandya',
      'Naman Dhir|AR|R|OB|IND', 'Robin Minz|WK|L|-|IND', 'Mitchell Santner', 'Corbin Bosch|AR|R|RFM|SA', 'Deepak Chahar|BOWL|R|RFM|IND',
      'Trent Boult|BOWL|R|LFM|NZ', 'Jasprit Bumrah', 'Karn Sharma|BOWL|L|LB|IND', 'Ashwani Kumar|BOWL|L|LFM|IND', 'Reece Topley|BOWL|R|LFM|ENG'] },
    { id: 'RCB', name: 'Royal Challengers Bengaluru', short: 'RCB', c1: '#d71920', c2: '#111111', cap: 'Rajat Patidar', p: [
      'Virat Kohli', 'Phil Salt', 'Devdutt Padikkal|BAT|L|-|IND', 'Rajat Patidar|BAT|R|OB|IND', 'Jitesh Sharma|WK|R|-|IND', 'Liam Livingstone',
      'Tim David', 'Jacob Bethell', 'Romario Shepherd', 'Krunal Pandya|AR|L|SLA|IND', 'Swapnil Singh|AR|R|SLA|IND', 'Bhuvneshwar Kumar|BOWL|R|RM|IND',
      'Josh Hazlewood', 'Yash Dayal|BOWL|L|LFM|IND', 'Rasikh Salam Dar|BOWL|R|RFM|IND', 'Suyash Sharma|BOWL|R|LB|IND', 'Lungi Ngidi'] },
    { id: 'KKR', name: 'Kolkata Knight Riders', short: 'KKR', c1: '#3a225d', c2: '#d4af37', cap: 'Ajinkya Rahane', p: [
      'Quinton de Kock', 'Sunil Narine|AR|L|OB|WI', 'Ajinkya Rahane|BAT|R|-|IND', 'Venkatesh Iyer|AR|L|RM|IND', 'Angkrish Raghuvanshi|BAT|R|-|IND',
      'Rinku Singh|BAT|L|OB|IND', 'Andre Russell|AR|R|RF|WI', 'Ramandeep Singh|AR|R|RM|IND', 'Rahmanullah Gurbaz', 'Moeen Ali|AR|L|OB|ENG',
      'Rovman Powell', 'Harshit Rana|BOWL|R|RF|IND', 'Vaibhav Arora|BOWL|R|RFM|IND', 'Varun Chakaravarthy', 'Anrich Nortje|BOWL|R|RF|SA',
      'Spencer Johnson|BOWL|L|LF|AUS'] },
    { id: 'SRH', name: 'Sunrisers Hyderabad', short: 'SRH', c1: '#f26522', c2: '#111111', cap: 'Pat Cummins', p: [
      'Travis Head', 'Abhishek Sharma', 'Ishan Kishan|WK|L|-|IND', 'Heinrich Klaasen|WK|R|-|SA', 'Nitish Kumar Reddy|AR|R|RFM|IND',
      'Aniket Verma|BAT|R|-|IND', 'Abhinav Manohar|BAT|R|-|IND', 'Kamindu Mendis', 'Pat Cummins', 'Harshal Patel|BOWL|R|RFM|IND',
      'Mohammed Shami|BOWL|R|RF|IND', 'Jaydev Unadkat|BOWL|R|LFM|IND', 'Adam Zampa', 'Rahul Chahar|BOWL|R|LB|IND', 'Zeeshan Ansari|BOWL|R|LB|IND',
      'Eshan Malinga|BOWL|R|RFM|SL'] },
    { id: 'RR', name: 'Rajasthan Royals', short: 'RR', c1: '#ea1a85', c2: '#254aa5', cap: 'Sanju Samson', p: [
      'Yashasvi Jaiswal', 'Sanju Samson', 'Vaibhav Suryavanshi|BAT|L|-|IND', 'Nitish Rana|BAT|L|OB|IND', 'Riyan Parag|AR|R|LB|IND',
      'Dhruv Jurel|WK|R|-|IND', 'Shimron Hetmyer', 'Shubham Dubey|BAT|L|-|IND', 'Wanindu Hasaranga', 'Maheesh Theekshana', 'Jofra Archer',
      'Sandeep Sharma|BOWL|R|RM|IND', 'Tushar Deshpande|BOWL|R|RFM|IND', 'Akash Madhwal|BOWL|R|RFM|IND', 'Fazalhaq Farooqi',
      'Kumar Kartikeya|BOWL|R|SLA|IND'] },
    { id: 'DC', name: 'Delhi Capitals', short: 'DC', c1: '#17449b', c2: '#ef1b23', cap: 'Axar Patel', p: [
      'Jake Fraser-McGurk|BAT|R|LB|AUS', 'Faf du Plessis|BAT|R|-|SA', 'KL Rahul', 'Abishek Porel|WK|L|-|IND', 'Karun Nair|BAT|R|OB|IND',
      'Tristan Stubbs', 'Ashutosh Sharma|BAT|R|-|IND', 'Sameer Rizvi|BAT|R|-|IND', 'Axar Patel', 'Vipraj Nigam|AR|R|LB|IND',
      'Mitchell Starc', 'Kuldeep Yadav', 'Mukesh Kumar|BOWL|R|RFM|IND', 'T Natarajan|BOWL|L|LFM|IND', 'Mohit Sharma|BOWL|R|RM|IND',
      'Dushmantha Chameera|BOWL|R|RF|SL'] },
    { id: 'PBKS', name: 'Punjab Kings', short: 'PBKS', c1: '#dd1f2d', c2: '#a7a9ac', cap: 'Shreyas Iyer', p: [
      'Prabhsimran Singh|WK|R|-|IND', 'Priyansh Arya|BAT|L|-|IND', 'Shreyas Iyer', 'Josh Inglis', 'Nehal Wadhera|BAT|L|-|IND',
      'Shashank Singh|BAT|R|-|IND', 'Marcus Stoinis', 'Glenn Maxwell', 'Azmatullah Omarzai', 'Marco Jansen', 'Harpreet Brar|AR|L|SLA|IND',
      'Arshdeep Singh', 'Yuzvendra Chahal|BOWL|R|LB|IND', 'Lockie Ferguson', 'Vijaykumar Vyshak|BOWL|R|RFM|IND', 'Xavier Bartlett|BOWL|R|RFM|AUS'] },
    { id: 'LSG', name: 'Lucknow Super Giants', short: 'LSG', c1: '#a2d0f0', c2: '#e2382c', cap: 'Rishabh Pant', p: [
      'Mitchell Marsh', 'Aiden Markram', 'Nicholas Pooran|WK|L|-|WI', 'Rishabh Pant', 'David Miller', 'Ayush Badoni|BAT|R|OB|IND',
      'Abdul Samad|BAT|R|LB|IND', 'Himmat Singh|BAT|R|-|IND', 'Shahbaz Ahmed|AR|L|SLA|IND', 'Shardul Thakur|AR|R|RFM|IND', 'Ravi Bishnoi|BOWL|R|LB|IND',
      'Digvesh Rathi|BOWL|R|LB|IND', 'Avesh Khan|BOWL|R|RFM|IND', 'Akash Deep|BOWL|R|RFM|IND', 'Prince Yadav|BOWL|R|RFM|IND', 'Mayank Yadav|BOWL|R|RF|IND'] },
    { id: 'GT', name: 'Gujarat Titans', short: 'GT', c1: '#1b2133', c2: '#c9a76a', cap: 'Shubman Gill', p: [
      'Shubman Gill', 'Sai Sudharsan|BAT|L|-|IND', 'Jos Buttler', 'Shahrukh Khan|BAT|R|OB|IND', 'Sherfane Rutherford', 'Glenn Phillips',
      'Anuj Rawat|WK|L|-|IND', 'Rahul Tewatia|AR|L|LB|IND', 'Washington Sundar', 'Rashid Khan', 'Sai Kishore|BOWL|L|SLA|IND', 'Arshad Khan|AR|L|LFM|IND',
      'Mohammed Siraj', 'Prasidh Krishna|BOWL|R|RF|IND', 'Kagiso Rabada', 'Ishant Sharma|BOWL|R|RF|IND', 'Gerald Coetzee'] }
  ];

  /* ---------- build player database with stable IDs ---------- */
  function slug(n) { return n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function hash01(str) { var h = 7; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return (h % 1000) / 1000; }
  var PLAYERS = {};
  // Game ratings: balancing estimates by role (+ a tiny deterministic spread). NOT official ratings.
  function ratings(role, bowl, id) {
    var j = (hash01(id) - 0.5) * 0.08;
    var r = { BAT: [0.8, 0.15], WK: [0.72, 0.05], AR: [0.66, 0.66], BOWL: [0.32, 0.8] }[role];
    var bt = r[0] + j, bw = bowl ? Math.max(0.35, r[1] + j * 0.7) : 0.05;
    return { bt: +bt.toFixed(2), bw: +bw.toFixed(2), fd: +(0.62 + (role === 'WK' ? 0.2 : 0) + j * 1.5).toFixed(2),
      rs: +(0.6 + j * 2).toFixed(2), pw: +(0.55 + (role === 'BAT' || role === 'AR' ? 0.12 : 0) + j * 2).toFixed(2) };
  }
  function addPlayer(line, nat) {
    var a = line.split('|'), id = slug(a[0]);
    if (PLAYERS[id]) return id;
    var bowl = a[3] && a[3] !== '-' ? a[3] : null;
    var p = { id: id, name: a[0], role: a[1], bat: a[2], bowl: bowl, nat: a[4] || nat };
    Object.assign(p, ratings(p.role, bowl, id));
    PLAYERS[id] = p; return id;
  }
  INTL.forEach(function (t) { t.squad = t.p.map(function (l) { return addPlayer(l, t.id); }); t.capId = slug(t.cap); });
  IPL.forEach(function (t) {
    t.squad = t.p.map(function (l) {
      if (l.indexOf('|') < 0) { var id = slug(l); if (!PLAYERS[id]) throw new Error('Unknown IPL reference ' + l); return id; }
      return addPlayer(l);
    });
    t.capId = slug(t.cap);
  });

  CRK.Rosters = {
    SNAPSHOT: SNAPSHOT, IPL_SEASON: IPL_SEASON, PLAYERS: PLAYERS, INTL: INTL, IPL: IPL,
    IPL_RULES: { overseasMax: 4, impactPlayer: true, note: 'Max 4 overseas in the XI; one Impact Player substitute (IPL 2023–2025 playing-condition concept, implemented simplified — not re-verified at build time).' },
    snapshotFor: function (teamId, format) {
      var t = INTL.filter(function (x) { return x.id === teamId; })[0];
      var label = SNAPSHOT.status + ' · compiled ' + SNAPSHOT.compiled + ' · shared pool (not ' + format + '-specific)';
      if (t && !t.test && /TEST/.test(format)) label = 'FICTIONAL / CUSTOM Test participation — ' + label;
      return label;
    },
    team: function (kind, id) { return (kind === 'ipl' ? IPL : INTL).filter(function (t) { return t.id === id; })[0]; },
    isOverseas: function (pid) { return PLAYERS[pid].nat !== 'IND'; },
    defaultXI: function (squad) {
      // sensible XI: 1 keeper, 6 batting options, 4-5 bowlers, ordered by role
      var ps = squad.map(function (id) { return PLAYERS[id]; });
      var keepers = ps.filter(function (p) { return p.role === 'WK'; });
      var bats = ps.filter(function (p) { return p.role === 'BAT'; });
      var ars = ps.filter(function (p) { return p.role === 'AR'; });
      var bowls = ps.filter(function (p) { return p.role === 'BOWL'; });
      var xi = [];
      function take(list, n) { list.slice(0).forEach(function (p) { if (n > 0 && xi.indexOf(p.id) < 0) { xi.push(p.id); n--; } }); }
      take(bats, 4); take(keepers, 1); take(ars, 3); take(bowls, 4);
      take(bats.concat(keepers, ars, bowls), 11 - xi.length);
      xi = xi.slice(0, 11);
      // ensure 5 bowling options
      var canBowl = function (id) { return !!PLAYERS[id].bowl; };
      while (xi.filter(canBowl).length < 5) {
        var spare = ps.filter(function (p) { return p.bowl && xi.indexOf(p.id) < 0; })[0];
        var drop = xi.slice().reverse().filter(function (id) { return !canBowl(id) && PLAYERS[id].role !== 'WK'; })[0];
        if (!spare || !drop) break; xi[xi.indexOf(drop)] = spare.id;
      }
      var order = { BAT: 0, WK: 1, AR: 2, BOWL: 3 };
      xi.sort(function (a, b) { return order[PLAYERS[a].role] - order[PLAYERS[b].role]; });
      var wk = xi.filter(function (id) { return PLAYERS[id].role === 'WK'; })[0] || xi[0];
      return { xi: xi, keeper: wk };
    }
  };
  if (typeof module !== 'undefined') module.exports = CRK;
})(typeof window !== 'undefined' ? window : globalThis);
