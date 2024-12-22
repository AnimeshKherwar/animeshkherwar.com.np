//Hook up the tweet display

$(document).ready(function() {
    // Get the current year
    var currentYear = new Date().getFullYear();
    // Set the countdown date to December 28th of the current year
    var countdownDate = "28 Dec " + currentYear + " 00:00:00";						   
	$(".countdown").countdown({
				date: countdownDate,
				format: "on"
			},
			
			function() {
				// callback function
			});

});	
