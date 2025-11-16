// Export utilities for CSV and PDF generation

export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    console.error("No data to export");
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(","), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that contain commas or quotes
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? "";
      }).join(",")
    )
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const formatDateForExport = (date: string | null) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

export const formatAssessmentsForExport = (assessments: any[]) => {
  return assessments.map(assessment => ({
    "Assessment ID": assessment.id,
    "Candidate Name": assessment.user_name,
    "Email": assessment.user_email,
    "Status": assessment.status,
    "Review Status": assessment.review_status,
    "Shortlisted": assessment.is_shortlisted ? "Yes" : "No",
    "Created Date": formatDateForExport(assessment.created_at),
    "Completed Date": formatDateForExport(assessment.completed_at),
    "Skill Score": assessment.assessment_results?.[0]?.skill_score ?? "N/A",
    "Will Score": assessment.assessment_results?.[0]?.will_score ?? "N/A",
    "Quadrant": assessment.assessment_results?.[0]?.quadrant ?? "N/A",
    "Recommended Role": assessment.assessment_results?.[0]?.recommended_role ?? "N/A"
  }));
};

export const formatAnalyticsForExport = (analytics: any) => {
  return [
    {
      "Metric": "Total Assessments",
      "Value": analytics.totalAssessments
    },
    {
      "Metric": "Pending Reviews",
      "Value": analytics.pendingReviews
    },
    {
      "Metric": "Shortlisted Candidates",
      "Value": analytics.shortlisted
    },
    {
      "Metric": "Average Skill Score",
      "Value": analytics.avgSkillScore
    },
    {
      "Metric": "Average Will Score",
      "Value": analytics.avgWillScore
    },
    {
      "Metric": "Completion Rate",
      "Value": `${analytics.completionRate}%`
    }
  ];
};

export const formatCandidateDetailsForExport = (candidate: any) => {
  const responses = candidate.assessment_responses || [];
  const result = candidate.assessment_results?.[0];
  
  return [
    {
      "Field": "Name",
      "Value": candidate.user_name
    },
    {
      "Field": "Email",
      "Value": candidate.user_email
    },
    {
      "Field": "Status",
      "Value": candidate.status
    },
    {
      "Field": "Created Date",
      "Value": formatDateForExport(candidate.created_at)
    },
    {
      "Field": "Completed Date",
      "Value": formatDateForExport(candidate.completed_at)
    },
    {
      "Field": "Skill Score",
      "Value": result?.skill_score ?? "N/A"
    },
    {
      "Field": "Will Score",
      "Value": result?.will_score ?? "N/A"
    },
    {
      "Field": "Quadrant",
      "Value": result?.quadrant ?? "N/A"
    },
    {
      "Field": "Recommended Role",
      "Value": result?.recommended_role ?? "N/A"
    },
    {
      "Field": "Leadership Style",
      "Value": result?.leadership_style ?? "N/A"
    },
    ...responses.map((response: any, index: number) => ({
      "Field": `Question ${index + 1}`,
      "Value": response.question_text
    })),
    ...responses.map((response: any, index: number) => ({
      "Field": `Answer ${index + 1}`,
      "Value": response.response_data?.answer ?? ""
    }))
  ];
};