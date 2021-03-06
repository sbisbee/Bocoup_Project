var docFactory = require('../../src/factories/DocFactory.js');
var OperationEnum = require('../../src/enums/OperationEnum.js');

exports["makeDocState() input validation"] = function(test) {
  test.expect(5);

  test.equal(
    typeof docFactory.makeDocState,
    'function',
    'makeDocState is not a function.'
  );

  test.equal(
    typeof docFactory.makeDocState({ id: 'did123123', gid: 'gid123123' }),
    'object',
    'Did not return a state object.'
  );

  test.throws(
    function() { docFactory.makeDocState({}); },
    'Did not throw an exception on a doc object missing an id.'
  );

  test.throws(
    function() { docFactory.makeDocState(null); },
    'Did not throw an exception on non-object input.'
  );

  test.throws(
    function() { docFactory.makeDocState('hi there'); },
    'Did not throw an exception on string input.'
  );

  test.done();
};

exports["makeDocState() output's functions"] = function(test) {
  test.expect(36);

  var state = docFactory.makeDocState({
    id: 'did123123',
    gid: 'gid123123',
    seq: null,
    text: ''
  });

  // Make sure the base functions exist.
  test.equal(
    typeof state.removeCursorObserver,
    'function',
    'removeCursorObserver() does not exist on the state object.'
  );

  test.equal(
    typeof state.joinUser,
    'function',
    'joinUser() does not exist on the state object.'
  );

  test.equal(
    typeof state.addCursorObserver,
    'function',
    'addCursorObserver() does not exist on the state object.'
  );

  test.equal(
    typeof state.updateCursor,
    'function',
    'updateCursor() does not exist on the state object.'
  );

  test.equal(
    typeof state.addChangeObserver,
    'function',
    'addChangeObserver() does not exist on the state object.'
  );

  test.equal(
    typeof state.execCommand,
    'function',
    'execCommand() does not exist on the state object.'
  );

  test.equal(
    typeof state.getDocText,
    'function',
    'getDocText() does not exist on the state object.'
  );

  test.equal(
    typeof state.flushBuffer,
    'function',
    'flushBuffer() does not exist on the state object.'
  );

  test.equal(
    typeof state.getDoc,
    'function',
    'getDoc() does not exist on the state object.'
  );

  // Make sure functions that require a user fail when provided a non-existing one.
  test.throws(
    function() { state.updateCursor('non-existing user', 32); },
    'Was able to update the cursor for a non-existing user.'
  );

  test.throws(
    function() { state.joinUser(123); },
    'Was able to set a user with a non-string UID.'
  );

  test.throws(
    function() { state.execCommand(docFactory.makeInsertCommand('uid', 0, 'a', 32)); },
    'Was able to exec a command from a user that has not joined.'
  );

  // Join a user, so everything after this should work with that user.
  var onInitialCursorUpdate = function(gid, docID, uid, pos) {
    test.equal(gid, 'gid123123', 'Incorrect gid.');
    test.equal(docID, 'did123123', 'Incorrect docID.');
    test.equal(uid, 'bwah', 'Incorrect UID reported.');
    test.equal(pos, 0, 'Incorrect initial cursor position reported.');
  };

  test.throws(
    function() { state.addCursorObserver(123); },
    'Was able to set a non-function callback.'
  );

  test.doesNotThrow(
    function() { state.addCursorObserver(onInitialCursorUpdate); },
    'Incorrectly threw up on a function.'
  );

  test.doesNotThrow(
    function() { state.joinUser('bwah'); },
    'Incorrectly threw up on a valid user ID.'
  );

  test.deepEqual(
    state.getUsers(),
    { 'bwah': { cursorPos: 0 } },
    'Users object was not initialized properly.'
  );

  test.ok(
    state.removeCursorObserver(onInitialCursorUpdate),
    'Was not able to remove the onInitialCursorUpdate() observer.'
  );

  var onCursorUpdate = function(gid, docID, uid, pos) {
    test.equal(gid, 'gid123123', 'Incorrect gid reported.');
    test.equal(docID, 'did123123', 'Incorrect docID reported.');
    test.equal(uid, 'bwah', 'Incorrect UID reported.');
    test.equal(pos, 32, 'Incorrect cursor position reported.');
  };

  test.doesNotThrow(
    function() { state.addCursorObserver(onCursorUpdate); },
    'Incorrect threw up on a valid observer function.'
  );

  test.doesNotThrow(
    function() { state.updateCursor('bwah', 32); },
    'Valid update parameters were not accepted.'
  );

  test.throws(
    function() { state.updateCursor(null, 32); },
    'Invalid UID was accepted.'
  );

  test.throws(
    function() { state.updateCursor('bwah', -1); },
    'Out of range cursor position was accepted.'
  );

  test.throws(
    function() { state.updateCursor('bwah', null); },
    'Invalid cursor position was accepted.'
  );

  test.ok(
    state.removeCursorObserver(onCursorUpdate),
    'Was not able to remove the onCursorUpdate() observer.'
  );

  test.throws(
    function() { state.joinUser('bwah'); },
    'The same user was allowed to join more than once.'
  );

  test.doesNotThrow(
    function() { state.joinUser('notAlreadyJoined'); },
    'A second, non-dupe user was not allowed to join.'
  );

  var validCommand = docFactory.makeInsertCommand('bwah', 0, 'a', 32);
  
  test.doesNotThrow(
    function() { state.execCommand(validCommand); },
    'Threw up on a valid command op and uid.'
  );

  var invalidCommand = validCommand;
  invalidCommand.op = 'asdf';

  test.throws(
    function() { state.execCommand(invalidCommand); },
    'Did not throw up on a invalid command op.'
  );

  var doc = state.getDoc();

  test.deepEqual(
    doc,
    {
      id: 'did123123',
      gid: 'gid123123',
      seq: 0,
      text: ''
    }
  );

  var flushedDoc = state.flushBuffer();

  test.done();
};

exports['makeInsertCommand()'] = function(test) {
  test.expect(1);

  test.deepEqual(
    docFactory.makeInsertCommand('uid', 0, 'a', null),
    {
      uid: 'uid',
      asOf: null,
      pos: 0,
      val: 'a',
      op: OperationEnum['INSERT']
    },
    'Invalid insert command returned.'
  );
    
  test.done();
};

exports['OT'] = function(test) {
  var state = docFactory.makeDocState({ id: 'someDoc', gid: 'someGroup' });

  state.addChangeObserver(function(data) {
    if(typeof data.command.asOf == 'number') {
      test.ok(data.command.asOf + 1 === data.command.seq, 'asOf and seq are diff by >1.');
    }
  });

  state.joinUser('uid');
  state.joinUser('otherUser');

  state.execCommand(docFactory.makeInsertCommand('uid', 0, 'b', null));
  state.execCommand(docFactory.makeInsertCommand('uid', 1, 'w', 0));
  state.execCommand(docFactory.makeInsertCommand('uid', 2, 'a', 1));
  state.execCommand(docFactory.makeInsertCommand('uid', 3, 'h', 2));

  //duplicate the 'a' out of seq order
  state.execCommand(docFactory.makeInsertCommand('otherUser', 2, 'a', 1));

  test.strictEqual(state.getDocText(), 'bwaah');

  //add an ! at the end out of seq order
  state.execCommand(docFactory.makeInsertCommand('uid', 4, '!', 3));
  test.strictEqual(state.getDocText(), 'bwaah!');

  //delete the first a
  state.execCommand(docFactory.makeDeleteCommand('uid', 3, 1, 5));
  test.strictEqual(state.getDocText(), 'bwah!');

  //delete the ! at the end
  state.execCommand(docFactory.makeDeleteCommand('uid', 5, 1, 6));
  test.strictEqual(state.getDocText(), 'bwah');

  //insert after where the ! used to be out of seq order
  state.execCommand(docFactory.makeInsertCommand('otherUser', 6, 'h', 5));
  test.strictEqual(state.getDocText(), 'bwahh');

  /*
   * Join a new user, have them send an update with an old seq #, and make sure
   * they get a replay. But only check toUser for old seq #'s.
   */
  state.joinUser('lagger');

  var laggerCallback = function(data) {
    if(data.command.seq < 9) {
      test.strictEqual(data.toUser, 'lagger', 'toUser not set properly.');
    }
    else {
      test.strictEqual(data.toUser, undefined, 'toUser set when it should not be.');
    }
  };

  state.addChangeObserver(laggerCallback);

  //this triggers both (2) observer callbacks
  state.execCommand(docFactory.makeInsertCommand('lagger', 0, 'l', 0));

  test.strictEqual(state.getDocText(), 'lbwahh');

  test.ok(state.removeChangeObserver(laggerCallback), 'Could not remove the callback.');

  /*
   * Tell the state to return the doc object, thereby flushing the command
   * buffer and updating its internal doc state. Then send it more commands and
   * make sure they get expected seq numbers, etc. Then get the doc's text and
   * make sure it's as expected.
   */
  var doc = state.flushBuffer();

  test.deepEqual(
    doc,
    {
      id: 'someDoc',
      gid: 'someGroup',
      text: 'lbwahh',
      seq: 9
    },
    'Updated internal doc state is not as expected.'
  );

  state.execCommand(docFactory.makeInsertCommand('uid', 7, '!', 9));
  test.strictEqual(state.getDocText(), 'lbwahh!', 'Doc not updated properly.');

  state.execCommand(docFactory.makeDeleteCommand('uid', 1, 1, 10));
  test.strictEqual(state.getDocText(), 'bwahh!', 'Doc not updated properly.');

  /*
   * Have a lagging user send a command with a seq that is earlier than the
   * ones we have in the buffer. We expect they will be told to pull the entire
   * doc as a result, their command getting dropped on the floor.
   */
  test.deepEqual(
    state.execCommand(docFactory.makeInsertCommand('lagger', 0, 'a', 8)),
    doc,
    'Did not get the internal doc state.'
  );

  test.done();  
};
