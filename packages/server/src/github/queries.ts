export const FOLLOWING_QUERY = `
  query($cursor: String) {
    viewer {
      following(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes { login }
      }
    }
  }
`;

export const STARRED_REPOS_QUERY = `
  query($cursor: String) {
    viewer {
      starredRepositories(first: 100, after: $cursor, orderBy: { field: STARRED_AT, direction: DESC }) {
        pageInfo { hasNextPage endCursor }
        nodes {
          owner { login }
          name
        }
      }
    }
  }
`;

export const USER_REPOS_QUERY = `
  query($cursor: String) {
    viewer {
      repositories(first: 100, after: $cursor, ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER], orderBy: { field: UPDATED_AT, direction: DESC }) {
        pageInfo { hasNextPage endCursor }
        nodes {
          owner { login }
          name
          viewerPermission
        }
      }
    }
  }
`;

export const SEARCH_QUERY = `
  query($query: String!, $cursor: String) {
    search(query: $query, type: ISSUE, first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      issueCount
      nodes {
        ... on PullRequest {
          __typename
          id
          number
          title
          url
          state
          isDraft
          createdAt
          updatedAt
          additions
          deletions
          reviewDecision
          author { login avatarUrl }
          repository { owner { login } name }
          labels(first: 10) { nodes { name } }
          participants(first: 1) { totalCount }
          comments { totalCount }
          reactions { totalCount }
          reviewRequests(first: 10) { nodes { requestedReviewer { ... on User { login } ... on Team { name } } } }
        }
        ... on Issue {
          __typename
          id
          number
          title
          url
          state
          createdAt
          updatedAt
          author { login avatarUrl }
          repository { owner { login } name }
          labels(first: 10) { nodes { name } }
          participants(first: 1) { totalCount }
          comments { totalCount }
          reactions { totalCount }
        }
      }
    }
  }
`;
