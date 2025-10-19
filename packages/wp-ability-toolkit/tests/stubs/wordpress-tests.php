<?php
/**
 * WordPress Test Suite Stubs
 *
 * This file provides type hints for WordPress test classes.
 * It's for IDE support only and should never be executed.
 *
 * @package WP_Ability_Toolkit
 */

// phpcs:disable

/**
 * Base test case class for WordPress unit tests.
 */
class WP_UnitTestCase extends PHPUnit\Framework\TestCase {
	/**
	 * The factory for creating test data.
	 *
	 * @var WP_UnitTest_Factory
	 */
	protected static $factory;

	/**
	 * Set up before class.
	 */
	public static function setUpBeforeClass(): void {}

	/**
	 * Tear down after class.
	 */
	public static function tearDownAfterClass(): void {}

	/**
	 * Set up before each test.
	 */
	public function setUp(): void {}

	/**
	 * Tear down after each test.
	 */
	public function tearDown(): void {}

	/**
	 * Go to a URL.
	 *
	 * @param string $url URL to go to.
	 */
	public function go_to( $url ) {}

	/**
	 * Set current user.
	 *
	 * @param int $user_id User ID.
	 */
	public function set_current_user( $user_id ) {}
}

/**
 * WordPress Ajax test case.
 */
class WP_Ajax_UnitTestCase extends WP_UnitTestCase {}

/**
 * WordPress REST API test case.
 */
class WP_REST_UnitTestCase extends WP_UnitTestCase {}

/**
 * WordPress XML-RPC test case.
 */
class WP_XMLRPC_UnitTestCase extends WP_UnitTestCase {}

/**
 * Factory for creating test data.
 */
class WP_UnitTest_Factory {
	/**
	 * Post factory.
	 *
	 * @var WP_UnitTest_Factory_For_Post
	 */
	public $post;

	/**
	 * User factory.
	 *
	 * @var WP_UnitTest_Factory_For_User
	 */
	public $user;

	/**
	 * Term factory.
	 *
	 * @var WP_UnitTest_Factory_For_Term
	 */
	public $term;

	/**
	 * Comment factory.
	 *
	 * @var WP_UnitTest_Factory_For_Comment
	 */
	public $comment;
}

/**
 * Factory for creating posts.
 */
class WP_UnitTest_Factory_For_Post {
	/**
	 * Create a post.
	 *
	 * @param array $args Post arguments.
	 * @return int Post ID.
	 */
	public function create( $args = array() ) {}

	/**
	 * Create and get a post.
	 *
	 * @param array $args Post arguments.
	 * @return WP_Post Post object.
	 */
	public function create_and_get( $args = array() ) {}
}

/**
 * Factory for creating users.
 */
class WP_UnitTest_Factory_For_User {
	/**
	 * Create a user.
	 *
	 * @param array $args User arguments.
	 * @return int User ID.
	 */
	public function create( $args = array() ) {}

	/**
	 * Create and get a user.
	 *
	 * @param array $args User arguments.
	 * @return WP_User User object.
	 */
	public function create_and_get( $args = array() ) {}
}

/**
 * Factory for creating terms.
 */
class WP_UnitTest_Factory_For_Term {
	/**
	 * Create a term.
	 *
	 * @param array $args Term arguments.
	 * @return int Term ID.
	 */
	public function create( $args = array() ) {}

	/**
	 * Create and get a term.
	 *
	 * @param array $args Term arguments.
	 * @return WP_Term Term object.
	 */
	public function create_and_get( $args = array() ) {}
}

/**
 * Factory for creating comments.
 */
class WP_UnitTest_Factory_For_Comment {
	/**
	 * Create a comment.
	 *
	 * @param array $args Comment arguments.
	 * @return int Comment ID.
	 */
	public function create( $args = array() ) {}

	/**
	 * Create and get a comment.
	 *
	 * @param array $args Comment arguments.
	 * @return WP_Comment Comment object.
	 */
	public function create_and_get( $args = array() ) {}
}
